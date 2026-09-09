package io.github.junhyoungparknobel.skylog;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** 인터넷을 끈 에뮬레이터에서 실제 WebView·번들 데이터·네이티브 플러그인을 검사한다. */
@RunWith(AndroidJUnit4.class)
public class OfflineSmokeTest {
    private String js(ActivityScenario<MainActivity> app, String expression) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        app.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(expression, result::complete));
        return result.get(8, TimeUnit.SECONDS);
    }
    private void waitFor(ActivityScenario<MainActivity> app, String condition) throws Exception {
        long end = System.currentTimeMillis() + 30000;
        while (System.currentTimeMillis() < end) {
            if ("true".equals(js(app, condition))) return;
            Thread.sleep(250);
        }
        fail("WebView condition: " + condition + "\n" + js(app, "document.body.innerText"));
    }
    @Test public void bundledLearningAndCoursesOpenOffline() throws Exception {
        try (ActivityScenario<MainActivity> app = ActivityScenario.launch(MainActivity.class)) {
            waitFor(app, "!!document.querySelector('[data-testid=sky-canvas]')");
            assertEquals("\"android\"", js(app, "Capacitor.getPlatform()"));
            assertEquals("true", js(app, "Capacitor.isPluginAvailable('SkylogMotion')"));
            js(app, "location.hash='#/learn?section=courses'");
            waitFor(app, "!!document.querySelector('[data-testid=course-theme-telescope]')");
            js(app, "document.querySelector('[data-testid=course-theme-telescope]').click()");
            waitFor(app, "!!document.querySelector('[data-testid=course-group-starhop]')");
            js(app, "document.querySelector('[data-testid=course-group-starhop]').click()");
            waitFor(app, "!!document.querySelector('[data-testid=hop-courses]')");
            assertEquals("6", js(app, "document.querySelectorAll('[data-testid=hop-courses] button').length"));
            js(app, "document.querySelector('[data-testid=course-hercules-keystone]').click()");
            waitFor(app, "!!document.querySelector('[data-testid=hop-course-detail]')");
            js(app, "location.hash='#/learn?section=quiz'");
            waitFor(app, "document.body.innerText.includes('스테이지') || document.body.innerText.includes('도전')");
            // 실제 번들에서 깊은 별 팩을 읽을 수 있는지도 확인한다.
            js(app, "window.__nativePack=null;fetch('/data/stars-deep.v1.bin').then(r=>r.arrayBuffer()).then(b=>window.__nativePack=b.byteLength)");
            waitFor(app, "window.__nativePack>2000000");
        }
    }

    /** 실제 Android intent → Capacitor → 웹 UI 복귀를 검사한다. 메일/세션은 만들지 않는다. */
    @Test public void loginLinksReachColdAndRunningAppWithoutNetwork() throws Exception {
        Context context = ApplicationProvider.getApplicationContext();
        String scheme = "io.github.junhyoungparknobel.skylog://";
        Intent cold = new Intent(Intent.ACTION_VIEW, Uri.parse(scheme + "login?error=access_denied&error_code=otp_expired"))
            .addCategory(Intent.CATEGORY_BROWSABLE)
            .setPackage(context.getPackageName())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        assertNotNull("Login intent must resolve to this app", cold.resolveActivity(context.getPackageManager()));
        Intent unrelated = new Intent(Intent.ACTION_VIEW, Uri.parse(scheme + "unrelated?code=fixture"))
            .addCategory(Intent.CATEGORY_BROWSABLE).setPackage(context.getPackageName());
        assertNull("Unrelated hosts must not resolve", unrelated.resolveActivity(context.getPackageManager()));
        try (ActivityScenario<MainActivity> app = ActivityScenario.launch(cold)) {
            waitFor(app, "!!document.querySelector('[data-testid=account-screen]') && document.body.innerText.includes('만료')");
            assertEquals("false", js(app, "location.href.includes('error_code') || location.href.includes('access_denied')"));
            js(app, "location.hash='#/sky'");
            waitFor(app, "!!document.querySelector('[data-testid=sky-canvas]')");
            Intent warm = new Intent(Intent.ACTION_VIEW, Uri.parse(scheme + "login?error=access_denied&error_code=over_email_send_rate_limit"))
                .addCategory(Intent.CATEGORY_BROWSABLE)
                .setPackage(context.getPackageName())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            app.onActivity(activity -> activity.startActivity(warm));
            waitFor(app, "!!document.querySelector('[data-testid=account-screen]') && document.body.innerText.includes('너무 빠르게')");
            assertEquals("false", js(app, "location.href.includes('error_code') || location.href.includes('access_denied')"));
        }
    }
}
