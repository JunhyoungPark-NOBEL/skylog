package io.github.junhyoungparknobel.skylog;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

/** Play 결제 UI와 원시 토큰 전달만 담당한다. 승인/소비/권한 부여는 하지 않는다. */
@CapacitorPlugin(name = "SkyardBilling")
public class SkyardBillingPlugin extends Plugin {
    private static final String PRODUCT = "skyard_plus_lifetime";
    private static final String OPTION = "buy";
    private BillingClient billing;
    private boolean connecting;
    private PluginCall purchaseCall;

    @Override public void load() {
        billing = BillingClient.newBuilder(getContext())
            .setListener((result, purchases) -> getActivity().runOnUiThread(() -> finishPurchase(result, purchases)))
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private String error(int code) {
        if (code == BillingClient.BillingResponseCode.ITEM_UNAVAILABLE) return "PRODUCT_UNAVAILABLE";
        if (code == BillingClient.BillingResponseCode.SERVICE_DISCONNECTED || code == BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE || code == BillingClient.BillingResponseCode.NETWORK_ERROR) return "BILLING_CONNECTION_FAILED";
        return "BILLING_UNAVAILABLE";
    }
    private void connected(PluginCall call, Runnable run) {
        getActivity().runOnUiThread(() -> {
            if (billing == null) { call.reject("BILLING_UNAVAILABLE"); return; }
            if (billing.isReady()) { run.run(); return; }
            if (connecting) { call.reject("BILLING_BUSY"); return; }
            connecting = true;
            billing.startConnection(new BillingClientStateListener() {
                @Override public void onBillingSetupFinished(BillingResult result) {
                    getActivity().runOnUiThread(() -> {
                        connecting = false;
                        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) run.run();
                        else call.reject(error(result.getResponseCode()));
                    });
                }
                @Override public void onBillingServiceDisconnected() { connecting = false; }
            });
        });
    }
    private interface ProductReady { void accept(ProductDetails product, ProductDetails.OneTimePurchaseOfferDetails offer); }
    private void product(PluginCall call, ProductReady ready) {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(
            QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.INAPP).build())).build();
        billing.queryProductDetailsAsync(params, (result, details) -> getActivity().runOnUiThread(() -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(error(result.getResponseCode())); return; }
            for (ProductDetails item : details.getProductDetailsList()) {
                if (!PRODUCT.equals(item.getProductId()) || item.getOneTimePurchaseOfferDetailsList() == null) continue;
                for (ProductDetails.OneTimePurchaseOfferDetails offer : item.getOneTimePurchaseOfferDetailsList()) {
                    // 단일 영구 구매만 판매한다. 대여/선주문/할인/수량 상품을 임의 선택하지 않는다.
                    if (OPTION.equals(offer.getPurchaseOptionId()) && offer.getOfferId() == null && offer.getRentalDetails() == null && offer.getPreorderDetails() == null && offer.getPriceAmountMicros() > 0) {
                        ready.accept(item, offer); return;
                    }
                }
            }
            call.reject("PRODUCT_UNAVAILABLE");
        }));
    }
    @PluginMethod public void getProduct(PluginCall call) {
        connected(call, () -> product(call, (item, offer) -> {
            JSObject value = new JSObject();
            value.put("id", PRODUCT); value.put("formattedPrice", offer.getFormattedPrice());
            value.put("currencyCode", offer.getPriceCurrencyCode()); value.put("priceMicros", offer.getPriceAmountMicros());
            JSObject out = new JSObject(); out.put("product", value); call.resolve(out);
        }));
    }
    @PluginMethod public void purchase(PluginCall call) {
        String account = call.getString("obfuscatedAccountId", "");
        if (!account.matches("[a-f0-9]{64}")) { call.reject("AUTH_REQUIRED"); return; }
        connected(call, () -> {
            if (purchaseCall != null) { call.reject("BILLING_BUSY"); return; }
            product(call, (item, offer) -> {
                if (purchaseCall != null) { call.reject("BILLING_BUSY"); return; }
                BillingFlowParams.ProductDetailsParams.Builder selection = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(item);
                if (offer.getOfferToken() != null) selection.setOfferToken(offer.getOfferToken());
                BillingFlowParams params = BillingFlowParams.newBuilder().setObfuscatedAccountId(account)
                    .setProductDetailsParamsList(Collections.singletonList(selection.build())).build();
                purchaseCall = call;
                BillingResult result = billing.launchBillingFlow(getActivity(), params);
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) finishPurchase(result, null);
            });
        });
    }
    private JSArray purchases(List<Purchase> values) {
        JSArray out = new JSArray();
        if (values == null) return out;
        for (Purchase purchase : values) {
            if (!purchase.getProducts().contains(PRODUCT)) continue;
            int state = purchase.getPurchaseState();
            if (state != Purchase.PurchaseState.PURCHASED && state != Purchase.PurchaseState.PENDING) continue;
            JSObject value = new JSObject();
            value.put("productId", PRODUCT); value.put("purchaseToken", purchase.getPurchaseToken());
            value.put("state", state == Purchase.PurchaseState.PURCHASED ? "purchased" : "pending"); out.put(value);
        }
        return out;
    }
    private void finishPurchase(BillingResult result, List<Purchase> values) {
        PluginCall call = purchaseCall; purchaseCall = null;
        // 앱이 꺼져 있을 때 완료된 대기 구매는 restore/queryPurchases에서 다시 전달한다.
        if (call == null) return;
        int code = result.getResponseCode();
        JSObject out = new JSObject(); out.put("purchases", purchases(values));
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) out.put("state", "cancelled");
        else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) out.put("state", "already-owned");
        else if (code == BillingClient.BillingResponseCode.OK) {
            if (values == null || values.isEmpty()) { call.reject("PURCHASE_NOT_RETURNED"); return; }
            boolean purchased = false;
            for (Purchase p : values) if (p.getProducts().contains(PRODUCT) && p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) purchased = true;
            out.put("state", purchased ? "purchased" : "pending");
        } else { call.reject(error(code)); return; }
        call.resolve(out);
    }
    @PluginMethod public void restore(PluginCall call) {
        connected(call, () -> billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (result, values) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject(error(result.getResponseCode())); return; }
            JSObject out = new JSObject(); out.put("purchases", purchases(values)); call.resolve(out);
        }));
    }
    @Override protected void handleOnDestroy() {
        if (purchaseCall != null) { purchaseCall.reject("BILLING_UNAVAILABLE"); purchaseCall = null; }
        if (billing != null) { billing.endConnection(); billing = null; }
    }
}
