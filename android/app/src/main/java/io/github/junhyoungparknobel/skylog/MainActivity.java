package io.github.junhyoungparknobel.skylog;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SkylogMotionPlugin.class);
        registerPlugin(SkyardBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
