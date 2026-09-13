package io.github.junhyoungparknobel.skylog;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.view.WindowManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;

/** 상대 모드는 자력계를 쓰지 않는다. Android의 기기→ENU 회전을 그대로 전달한다. */
@CapacitorPlugin(name = "SkylogMotion")
public class SkylogMotionPlugin extends Plugin implements SensorEventListener {
    private SensorManager manager;
    private String session = "";
    private boolean relative;
    private boolean running;
    private boolean hybrid;
    private long lastMotionNs;
    private long firstReferenceNs;

    @Override public void load() { manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE); }
    @PluginMethod public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            halt();
            relative = call.getBoolean("relative", true);
            session = call.getString("session", "");
            Sensor sensor = manager == null ? null : manager.getDefaultSensor(relative ? Sensor.TYPE_GAME_ROTATION_VECTOR : Sensor.TYPE_ROTATION_VECTOR);
            if (sensor == null || !manager.registerListener(this, sensor, relative ? 16667 : 50000)) { call.reject("Orientation sensor unavailable"); return; }
            // 자동 모드: 빠른 회전은 자력계 없는 게임 벡터, 북쪽 기준은 기존 절대 벡터에서 얻는다.
            Sensor game = !relative ? manager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR) : null;
            hybrid = game != null && manager.registerListener(this, game, 16667);
            if (!relative && !hybrid) manager.registerListener(this, sensor, 16667);
            lastMotionNs = 0;
            firstReferenceNs = 0;
            running = true;
            call.resolve();
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (session.equals(call.getString("session", ""))) { halt(); session = ""; }
            call.resolve();
        });
    }
    @PluginMethod public void keepAwake(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (call.getBoolean("enabled", false)) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
    private void halt() { running = false; hybrid = false; if (manager != null) manager.unregisterListener(this); }
    @Override protected void handleOnPause() { halt(); }
    @Override protected void handleOnDestroy() { halt(); }
    @Override public void onSensorChanged(SensorEvent event) {
        if (!running) return;
        boolean game = event.sensor.getType() == Sensor.TYPE_GAME_ROTATION_VECTOR;
        if (!relative && !hybrid && game) return; // 해제 직전 대기열에 있던 상대 자세를 자북으로 쓰지 않는다.
        if (hybrid && game) lastMotionNs = event.timestamp;
        if (hybrid && !game) {
            if (firstReferenceNs == 0) firstReferenceNs = event.timestamp;
            long motionTime = lastMotionNs == 0 ? firstReferenceNs : lastMotionNs;
            // 게임 벡터가 지원된다고 보고해도 실제 입력이 멈추면 기존 절대 벡터로 복귀한다.
            if (event.timestamp - motionTime > 500000000L) {
                Sensor sensor = manager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
                if (sensor != null) manager.unregisterListener(this, sensor);
                hybrid = false;
                manager.registerListener(this, event.sensor, 16667);
            }
        }
        float[] q = new float[4];
        SensorManager.getQuaternionFromVector(q, event.values);
        for (float component : q) if (!Float.isFinite(component)) return;
        JSArray xyzw = new JSArray(Arrays.asList(q[1], q[2], q[3], q[0]));
        JSObject value = new JSObject();
        value.put("timestampMs", event.timestamp / 1000000.0);
        if (hybrid) value.put("channel", game ? "motion" : "reference");
        value.put("quaternion", xyzw); value.put("session", session);
        value.put("northReference", relative ? "relative" : "magnetic");
        // TYPE_ROTATION_VECTOR의 다섯 번째 성분은 방위 오차(rad), 음수는 미상이므로 생략한다.
        if (!relative && !game && event.values.length >= 5 && Float.isFinite(event.values[4]) && event.values[4] >= 0)
            value.put("headingAccuracyDeg", Math.toDegrees(event.values[4]));
        notifyListeners("orientation", value);
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
}
