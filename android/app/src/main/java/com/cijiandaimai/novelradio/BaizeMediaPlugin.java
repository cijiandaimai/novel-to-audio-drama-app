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
import android.util.Log;

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
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(
    name = "BaizeMedia",
    permissions = {
        @Permission(alias = "media", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "legacyWrite", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class BaizeMediaPlugin extends Plugin {
    private static final String TAG = "BaizeMediaPlugin";
    private static final String APP_FOLDER = "白泽声工坊";
    private final Map<String, SaveSession> saveSessions = new HashMap<>();

    private static class SaveSession {
        String id;
        String title;
        String fileName;
        String mimeType;
        Uri uri;
        File file;
        OutputStream output;
        long size;
    }

    @PluginMethod
    public void saveAudioSegments(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyWrite", call, "saveAudioSegmentsPermsCallback");
            return;
        }
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
            call.reject("保存到下载文件夹失败：" + safeMessage(error), error);
        }
    }

    @PermissionCallback
    private void saveAudioSegmentsPermsCallback(PluginCall call) {
        if (getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            call.reject("未获得存储权限，无法把音频保存到下载文件夹。");
            return;
        }
        saveAudioSegments(call);
    }

    @PluginMethod
    public void startAudioSegmentSave(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyWrite", call, "startAudioSegmentSavePermsCallback");
            return;
        }
        String title = safeName(call.getString("title", "Untitled"));
        String fileName = safeFileName(call.getString("fileName", "mix.wav"), 0);
        String mimeType = call.getString("mimeType", guessMimeType(fileName));
        try {
            SaveSession session = openSaveSession(title, fileName, mimeType);
            saveSessions.put(session.id, session);
            JSObject result = new JSObject();
            result.put("sessionId", session.id);
            result.put("folder", "Download/" + APP_FOLDER + "/" + title);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("创建音频导出文件失败：" + safeMessage(error), error);
        }
    }

    @PermissionCallback
    private void startAudioSegmentSavePermsCallback(PluginCall call) {
        if (getPermissionState("legacyWrite") != PermissionState.GRANTED) {
            call.reject("未获得存储权限，无法创建导出文件。");
            return;
        }
        startAudioSegmentSave(call);
    }

    @PluginMethod
    public void appendAudioSegmentChunk(PluginCall call) {
        String sessionId = call.getString("sessionId", "");
        SaveSession session = saveSessions.get(sessionId);
        if (session == null) {
            call.reject("导出任务已失效，请重新导出。");
            return;
        }
        try {
            if (session.output == null) {
                throw new IllegalStateException("导出文件流已关闭，请重新导出。");
            }
            String data = call.getString("base64", "");
            if (!data.isEmpty()) {
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                session.output.write(bytes);
                session.size += bytes.length;
            }
            call.resolve(new JSObject());
        } catch (Exception error) {
            call.reject("写入音频数据失败：" + safeMessage(error), error);
        }
    }

    @PluginMethod
    public void finishAudioSegmentSave(PluginCall call) {
        String sessionId = call.getString("sessionId", "");
        SaveSession session = saveSessions.remove(sessionId);
        if (session == null) {
            call.reject("导出任务已失效，请重新导出。");
            return;
        }
        try {
            closeSessionOutput(session);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && session.uri != null) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (getContext().getContentResolver().update(session.uri, values, null, null) <= 0) {
                    throw new IllegalStateException("音频已写入，但系统未能发布导出文件");
                }
            }
            JSArray files = new JSArray();
            String uri = session.uri != null ? session.uri.toString() : Uri.fromFile(session.file).toString();
            String path = session.file != null ? session.file.getAbsolutePath() : "Download/" + APP_FOLDER + "/" + session.title + "/" + session.fileName;
            files.put(savedFileObject(session.fileName, session.mimeType, uri, path, session.size));
            JSObject result = new JSObject();
            result.put("folder", "Download/" + APP_FOLDER + "/" + session.title);
            result.put("count", files.length());
            result.put("files", files);
            call.resolve(result);
        } catch (Exception error) {
            discardSaveSession(session);
            call.reject("完成音频导出失败：" + safeMessage(error), error);
        }
    }

    @PluginMethod
    public void abortAudioSegmentSave(PluginCall call) {
        String sessionId = call.getString("sessionId", "");
        SaveSession session = saveSessions.remove(sessionId);
        discardSaveSession(session);
        call.resolve(new JSObject());
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
            call.reject("扫描下载文件夹失败：" + safeMessage(error), error);
        }
    }

    @PermissionCallback
    private void scanDownloadsPermsCallback(PluginCall call) {
        boolean denied = Build.VERSION.SDK_INT >= 33
            ? getPermissionState("media") != PermissionState.GRANTED
            : getPermissionState("storage") != PermissionState.GRANTED;
        if (denied) {
            call.reject("未获得音频读取权限，无法扫描下载文件夹。请到系统设置中允许后重试。");
            return;
        }
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
            try {
                OutputStream output = resolver.openOutputStream(uri);
                if (output == null) throw new IllegalStateException("系统没有返回可写入的下载文件流");
                try (OutputStream closeable = output) {
                    closeable.write(bytes);
                    closeable.flush();
                }
                values.clear();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (resolver.update(uri, values, null, null) <= 0) {
                    throw new IllegalStateException("下载文件写入完成，但系统未能发布该文件");
                }
            } catch (Exception error) {
                try {
                    resolver.delete(uri, null, null);
                } catch (Exception cleanupError) {
                    Log.w(TAG, "Failed to remove an incomplete download row", cleanupError);
                }
                throw error;
            }
            return savedFileObject(fileName, mimeType, uri.toString(), "Download/" + APP_FOLDER + "/" + title + "/" + fileName, bytes.length);
        }

        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), APP_FOLDER + "/" + title);
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("无法创建下载目录");
        File file = new File(dir, fileName);
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
            output.flush();
        } catch (Exception error) {
            if (file.exists() && !file.delete()) {
                Log.w(TAG, "Failed to remove incomplete legacy download: " + file.getAbsolutePath());
            }
            throw error;
        }
        Uri uri = Uri.fromFile(file);
        return savedFileObject(fileName, mimeType, uri.toString(), file.getAbsolutePath(), bytes.length);
    }

    private SaveSession openSaveSession(String title, String fileName, String mimeType) throws Exception {
        SaveSession session = new SaveSession();
        session.id = "save-" + System.currentTimeMillis() + "-" + Math.round(Math.random() * 1000000);
        session.title = title;
        session.fileName = fileName;
        session.mimeType = mimeType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + APP_FOLDER + "/" + title);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            ContentResolver resolver = getContext().getContentResolver();
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Cannot create or write download file");
            try {
                OutputStream output = resolver.openOutputStream(uri);
                if (output == null) throw new IllegalStateException("系统没有返回可写入的导出文件流");
                session.uri = uri;
                session.output = output;
                return session;
            } catch (Exception error) {
                try {
                    resolver.delete(uri, null, null);
                } catch (Exception cleanupError) {
                    Log.w(TAG, "Failed to remove an incomplete export row", cleanupError);
                }
                throw error;
            }
        }

        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), APP_FOLDER + "/" + title);
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Cannot create or write download file");
        File file = new File(dir, fileName);
        session.file = file;
        try {
            session.output = new FileOutputStream(file);
            return session;
        } catch (Exception error) {
            if (file.exists() && !file.delete()) {
                Log.w(TAG, "Failed to remove incomplete legacy export: " + file.getAbsolutePath());
            }
            throw error;
        }
    }

    private void closeSessionOutput(SaveSession session) throws Exception {
        if (session != null && session.output != null) {
            OutputStream output = session.output;
            session.output = null;
            try {
                output.flush();
            } finally {
                output.close();
            }
        }
    }

    private void discardSaveSession(SaveSession session) {
        if (session == null) return;
        try {
            closeSessionOutput(session);
        } catch (Exception error) {
            Log.w(TAG, "Failed to close an incomplete export", error);
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && session.uri != null) {
                getContext().getContentResolver().delete(session.uri, null, null);
            } else if (session.file != null && session.file.exists() && !session.file.delete()) {
                Log.w(TAG, "Failed to remove incomplete export file: " + session.file.getAbsolutePath());
            }
        } catch (Exception error) {
            Log.w(TAG, "Failed to remove an incomplete export", error);
        }
    }

    @Override
    protected void handleOnDestroy() {
        for (SaveSession session : new ArrayList<>(saveSessions.values())) {
            discardSaveSession(session);
        }
        saveSessions.clear();
        super.handleOnDestroy();
    }

    private JSArray queryAudioDownloads() {
        JSArray result = new JSArray();
        Uri uri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        boolean hasRelativePath = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
        String[] projection = hasRelativePath
            ? new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.RELATIVE_PATH
            }
            : new String[]{
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.MIME_TYPE,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.DURATION
            };
        String selection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? MediaStore.Audio.Media.RELATIVE_PATH + " LIKE ?"
            : null;
        String[] args = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? new String[]{Environment.DIRECTORY_DOWNLOADS + "%"}
            : null;
        Cursor queried;
        try {
            queried = getContext().getContentResolver().query(uri, projection, selection, args, null);
        } catch (SecurityException error) {
            throw new IllegalStateException("没有读取系统音频库的权限，请在系统设置中允许音频访问。", error);
        } catch (RuntimeException error) {
            throw new IllegalStateException("系统音频库查询失败：" + safeMessage(error), error);
        }
        if (queried == null) throw new IllegalStateException("系统音频库没有返回查询结果，请稍后重试。");
        try (Cursor cursor = queried) {
            while (cursor.moveToNext()) {
                long id = cursor.getLong(0);
                Uri contentUri = ContentUris.withAppendedId(uri, id);
                JSObject item = new JSObject();
                item.put("name", cursor.getString(1));
                item.put("mimeType", cursor.getString(2));
                item.put("size", cursor.getLong(3));
                item.put("duration", cursor.getLong(4));
                item.put("relativePath", hasRelativePath ? cursor.getString(5) : "");
                item.put("uri", contentUri.toString());
                result.put(item);
            }
        }
        return sortByName(result);
    }

    private JSArray queryLyricDownloads() throws Exception {
        JSArray result = new JSArray();
        Set<String> seen = new HashSet<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                appendLyricMediaRows(MediaStore.Files.getContentUri("external"), result, seen);
            } catch (Exception error) {
                // Some Android builds restrict generic file queries; try Downloads below.
                Log.w(TAG, "Generic MediaStore lyric query is unavailable", error);
            }
            try {
                appendLyricMediaRows(MediaStore.Downloads.EXTERNAL_CONTENT_URI, result, seen);
            } catch (Exception error) {
                // Keep audio scan usable even when text lyrics are not exposed by MediaStore.
                Log.w(TAG, "Downloads lyric query is unavailable", error);
            }
        } else {
            scanLegacyLyrics(new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), ""), result, seen);
        }
        return sortByName(result);
    }

    private void appendLyricMediaRows(Uri uri, JSArray result, Set<String> seen) throws Exception {
        String[] projection = {
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DISPLAY_NAME,
            MediaStore.MediaColumns.MIME_TYPE,
            MediaStore.MediaColumns.SIZE,
            MediaStore.MediaColumns.RELATIVE_PATH
        };
        String selection = MediaStore.MediaColumns.RELATIVE_PATH + " LIKE ?";
        String[] args = new String[]{Environment.DIRECTORY_DOWNLOADS + "%"};
        Cursor queried;
        try {
            queried = getContext().getContentResolver().query(uri, projection, selection, args, null);
        } catch (SecurityException error) {
            throw new IllegalStateException("系统不允许读取下载文件夹中的歌词。", error);
        } catch (RuntimeException error) {
            throw new IllegalStateException("歌词文件查询失败：" + safeMessage(error), error);
        }
        if (queried == null) {
            Log.w(TAG, "MediaStore returned a null cursor for lyric query: " + uri);
            return;
        }
        try (Cursor cursor = queried) {
            while (cursor.moveToNext()) {
                String name = cursor.getString(1);
                if (!isLyricName(name)) continue;
                long id = cursor.getLong(0);
                Uri contentUri = ContentUris.withAppendedId(uri, id);
                String key = contentUri.toString();
                if (seen.contains(key)) continue;
                seen.add(key);
                JSObject item = new JSObject();
                item.put("name", name);
                item.put("mimeType", cursor.getString(2));
                item.put("size", cursor.getLong(3));
                item.put("relativePath", cursor.getString(4));
                item.put("uri", contentUri.toString());
                item.put("text", safeReadText(contentUri, 2 * 1024 * 1024));
                result.put(item);
            }
        }
    }

    private void scanLegacyLyrics(File dir, JSArray result, Set<String> seen) throws Exception {
        File[] files = dir.listFiles();
        if (files == null) {
            Log.w(TAG, "Cannot list legacy lyric directory: " + dir.getAbsolutePath());
            return;
        }
        for (File file : files) {
            if (file.isDirectory()) {
                scanLegacyLyrics(file, result, seen);
                continue;
            }
            if (!isLyricName(file.getName())) continue;
            String key = file.getAbsolutePath();
            if (seen.contains(key)) continue;
            seen.add(key);
            Uri uri = Uri.fromFile(file);
            JSObject item = new JSObject();
            item.put("name", file.getName());
            item.put("mimeType", "text/plain");
            item.put("size", file.length());
            item.put("relativePath", relativeDownloadPath(file));
            item.put("uri", uri.toString());
            item.put("text", safeReadText(uri, 2 * 1024 * 1024));
            result.put(item);
        }
    }

    private String relativeDownloadPath(File file) {
        String downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath();
        String path = file.getAbsolutePath();
        if (path.startsWith(downloads)) {
            String relative = path.substring(downloads.length()).replace(File.separatorChar, '/');
            if (relative.startsWith("/")) relative = relative.substring(1);
            return Environment.DIRECTORY_DOWNLOADS + "/" + relative;
        }
        return path;
    }

    private String safeReadText(Uri uri, int limit) {
        try {
            return readText(uri, limit);
        } catch (Exception error) {
            Log.w(TAG, "Failed to read lyric text: " + uri, error);
            return "";
        }
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

    private String safeMessage(Throwable error) {
        String message = error == null ? "" : error.getMessage();
        return message == null || message.trim().isEmpty() ? "未知系统错误" : message.trim();
    }
}
