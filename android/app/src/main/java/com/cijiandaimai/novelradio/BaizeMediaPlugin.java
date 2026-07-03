package com.cijiandaimai.novelradio;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;

@CapacitorPlugin(
    name = "BaizeMedia",
    permissions = {
        @Permission(alias = "media", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class BaizeMediaPlugin extends Plugin {
    private static final String APP_FOLDER = "白泽声工坊";

    @PluginMethod
    public void saveAudioSegments(PluginCall call) {
        String title = safeName(call.getString("title", "未命名作品"));
        JSONArray segments = call.getArray("segments", new JSArray());
        JSArray files = new JSArray();
        try {
            for (int i = 0; i < segments.length(); i++) {
                JSONObject segment = segments.getJSONObject(i);
                String fileName = safeFileName(segment.optString("fileName", String.format(Locale.ROOT, "%03d.wav", i + 1)), i);
                String mimeType = segment.optString("mimeType", guessMimeType(fileName));
                String data = segment.optString("base64", "");
                if (data.isEmpty()) data = extractBase64(segment.optString("dataUrl", ""));
                if (data.isEmpty()) continue;
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                JSObject saved = saveBytesToDownloads(title, fileName, mimeType, bytes);
                files.put(saved);
            }
            JSObject result = new JSObject();
            result.put("folder", "Download/" + APP_FOLDER + "/" + title);
            result.put("count", files.length());
            result.put("files", files);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("保存到下载文件夹失败：" + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void scanDownloads(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("media") != PermissionState.GRANTED) {
            requestPermissionForAlias("media", call, "scanDownloadsPermsCallback");
            return;
        }
        if (Build.VERSION.SDK_INT < 33 && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "scanDownloadsPermsCallback");
            return;
        }
        try {
            JSArray audio = queryAudioDownloads();
            JSArray lyrics = queryLyricDownloads();
            JSObject result = new JSObject();
            result.put("audio", audio);
            result.put("lyrics", lyrics);
            result.put("audioCount", audio.length());
            result.put("lyricCount", lyrics.length());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("扫描下载文件夹失败：" + error.getMessage(), error);
        }
    }

    @PermissionCallback
    private void scanDownloadsPermsCallback(PluginCall call) {
        scanDownloads(call);
    }

    private JSObject saveBytesToDownloads(String title, String fileName, String mimeType, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + APP_FOLDER + "/" + title);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            ContentResolver resolver = getContext().getContentResolver();
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("无法创建下载文件");
            try (OutputStream output = resolver.openOutputStream(uri)) {
                if (output == null) throw new IllegalStateException("无法写入下载文件");
                output.write(bytes);
            }
            values.clear();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return savedFileObject(fileName, mimeType, uri.toString(), "Download/" + APP_FOLDER + "/" + title + "/" + fileName, bytes.length);
        }

        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), APP_FOLDER + "/" + title);
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建下载目录");
        File file = new File(dir, fileName);
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
        Uri uri = Uri.fromFile(file);
        return savedFileObject(fileName, mimeType, uri.toString(), file.getAbsolutePath(), bytes.length);
    }

    private JSArray queryAudioDownloads() {
        JSArray result = new JSArray();
        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.RELATIVE_PATH
        };
        String selection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? MediaStore.Audio.Media.RELATIVE_PATH + " LIKE ?"
            : null;
        String[] args = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? new String[]{Environment.DIRECTORY_DOWNLOADS + "%"}
            : null;
        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, null)) {
            if (cursor == null) return result;
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                Uri contentUri = ContentUris.withAppendedId(uri, id);
                JSObject item = new JSObject();
                item.put("name", cursor.getString(1));
                item.put("mimeType", cursor.getString(2));
                item.put("size", cursor.getLong(3));
                item.put("duration", cursor.getLong(4));
                item.put("relativePath", cursor.getString(5));
                item.put("uri", contentUri.toString());
                result.put(item);
            }
        }
        return sortByName(result);
    }

    private JSArray queryLyricDownloads() throws Exception {
        JSArray result = new JSArray();
        Uri uri = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? MediaStore.Downloads.EXTERNAL_CONTENT_URI
            : MediaStore.Files.getContentUri("external");
        String[] projection = {
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.MIME_TYPE,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.RELATIVE_PATH
        };
        String selection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? MediaStore.MediaColumns.RELATIVE_PATH + " LIKE ?"
            : null;
        String[] args = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? new String[]{Environment.DIRECTORY_DOWNLOADS + "%"}
            : null;
        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, null)) {
            if (cursor == null) return result;
            while (cursor.moveToNext()) {
                String name = cursor.getString(1);
                if (!isLyricName(name)) continue;
                long id = cursor.getLong(0);
                Uri contentUri = ContentUris.withAppendedId(uri, id);
                JSObject item = new JSObject();
                item.put("name", name);
                item.put("mimeType", cursor.getString(2));
                item.put("size", cursor.getLong(3));
                item.put("relativePath", cursor.getString(4));
                item.put("uri", contentUri.toString());
                item.put("text", readText(contentUri, 2 * 1024 * 1024));
                result.put(item);
            }
        }
        return sortByName(result);
    }

    private String readText(Uri uri, int limit) throws Exception {
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) return "";
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) != -1 && total < limit) {
                int count = Math.min(read, limit - total);
                output.write(buffer, 0, count);
                total += count;
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private JSArray sortByName(JSArray input) {
        ArrayList<JSONObject> items = new ArrayList<>();
        for (int i = 0; i < input.length(); i++) {
            JSONObject item = input.optJSONObject(i);
            if (item != null) items.add(item);
        }
        Collator collator = Collator.getInstance(Locale.CHINA);
        items.sort(Comparator.comparing((JSONObject item) -> item.optString("name", ""), collator));
        JSArray output = new JSArray();
        for (JSONObject item : items) output.put(item);
        return output;
    }

    private JSObject savedFileObject(String fileName, String mimeType, String uri, String path, long size) {
        JSObject object = new JSObject();
        object.put("name", fileName);
        object.put("mimeType", mimeType);
        object.put("uri", uri);
        object.put("path", path);
        object.put("size", size);
        return object;
    }

    private String extractBase64(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        return comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
    }

    private String safeName(String value) {
        String clean = value == null ? "" : value.replaceAll("[\\\\/:*?\"<>|]+", "_").trim();
        if (clean.isEmpty()) return "未命名作品";
        return clean.length() > 80 ? clean.substring(0, 80) : clean;
    }

    private String safeFileName(String fileName, int index) {
        String clean = safeName(fileName);
        if (!clean.matches(".*\\.[A-Za-z0-9]{2,5}$")) clean += ".wav";
        return String.format(Locale.ROOT, "%03d-%s", index + 1, clean.replaceAll("^\\d{1,3}-", ""));
    }

    private boolean isLyricName(String name) {
        return name != null && name.toLowerCase(Locale.ROOT).matches(".*\\.(lrc|krc|txt)$");
    }

    private String guessMimeType(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".ogg") || lower.endsWith(".opus")) return "audio/ogg";
        return "audio/wav";
    }
}
