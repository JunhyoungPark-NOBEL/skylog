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

    @Override public void load() { manager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE); }
    @PluginMethod public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            halt();
            relative = call.getBoolean("relative", true);
            session = call.getString("session", "");
            Sensor sensor = manager == null ? null : manager.getDefaultSensor(relative ? Sensor.TYPE_GAME_ROTATION_VECTOR : Sensor.TYPE_ROTATION_VECTOR);
            if (sensor == null || !manager.registerListener(this, sensor, 33333)) { call.reject("Orientation sensor unavailable"); return; }
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
    private void halt() { running = false; if (manager != null) manager.unregisterListener(this); }
    @Override protected void handleOnPause() { halt(); }
    @Override protected void handleOnDestroy() { halt(); }
    @Override public void onSensorChanged(SensorEvent event) {
        if (!running) return;
        float[] q = new float[4];
        SensorManager.getQuaternionFromVector(q, event.values);
        for (float component : q) if (!Float.isFinite(component)) return;
        JSArray xyzw = new JSArray(Arrays.asList(q[1], q[2], q[3], q[0]));
        JSObject value = new JSObject();
        value.put("quaternion", xyzw); value.put("session", session);
        value.put("northReference", relative ? "relative" : "magnetic");
        notifyListeners("orientation", value);
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
}
