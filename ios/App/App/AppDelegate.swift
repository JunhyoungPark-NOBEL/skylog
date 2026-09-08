import UIKit
import Capacitor
import CoreMotion
import simd

class SkylogViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(SkylogMotionPlugin()) }
}

@objc(SkylogMotionPlugin)
public class SkylogMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SkylogMotionPlugin"
    public let jsName = "SkylogMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise)
    ]
    private let motion = CMMotionManager()
    private var session = ""
    private var pauseObserver: NSObjectProtocol?
    public override func load() {
        pauseObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.motion.stopDeviceMotionUpdates() }
    }
    deinit { if let token = pauseObserver { NotificationCenter.default.removeObserver(token) } }
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("Motion unavailable"); return }
            self.motion.stopDeviceMotionUpdates()
            guard self.motion.isDeviceMotionAvailable else { call.reject("Motion unavailable"); return }
            let relative = call.getBool("relative") ?? true
            let frame: CMAttitudeReferenceFrame = relative ? .xArbitraryZVertical : .xMagneticNorthZVertical
            guard CMMotionManager.availableAttitudeReferenceFrames().contains(frame) else { call.reject("Reference frame unavailable"); return }
            self.session = call.getString("session") ?? ""
            let token = self.session
            self.motion.deviceMotionUpdateInterval = 1.0 / 30.0
            self.motion.startDeviceMotionUpdates(using: frame, to: .main) { [weak self] data, _ in
                guard let self = self, self.session == token, let data = data else { return }
                let q = data.attitude.quaternion
                // Core Motion의 북·서·천정 기준을 ENU로 바꾼다. 상대 모드는 yaw만 임의다.
                let enu = simd_quatd(angle: .pi / 2, axis: SIMD3<Double>(0, 0, 1)) * simd_quatd(ix: q.x, iy: q.y, iz: q.z, r: q.w)
                self.notifyListeners("orientation", data: ["quaternion": [enu.imag.x, enu.imag.y, enu.imag.z, enu.real], "northReference": relative ? "relative" : "magnetic", "session": token])
            }
            call.resolve()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if self?.session == call.getString("session") { self?.motion.stopDeviceMotionUpdates(); self?.session = "" }
            call.resolve()
        }
    }
    @objc func keepAwake(_ call: CAPPluginCall) {
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = call.getBool("enabled") ?? false; call.resolve() }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
