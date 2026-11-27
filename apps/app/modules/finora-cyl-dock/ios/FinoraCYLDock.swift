import CYLTabBarController
import ExpoModulesCore
import UIKit

public final class FinoraCYLDockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FinoraCYLDock")
    Constant("isLiquidGlassActive") { CYLConstants.isLiquidGlassActive() }
    View(FinoraCYLDockView.self) {
      Events("onTabSelect", "onDockHeight")
      Prop("titles") { (view, titles: [String]) in view.setTitles(titles) }
      Prop("selectedIndex") { (view, index: Int) in view.setSelected(index) }
      Prop("dark") { (view, dark: Bool) in
        view.overrideUserInterfaceStyle = dark ? .dark : .light
      }
      Prop("compact") { (view, compact: Bool) in view.setCompact(compact) }
      Prop("routeKey") { (view, route: String) in view.setRoute(route) }
      Prop("scrollTarget") { (view, target: String) in view.setScrollTarget(target) }
    }
  }
}

// The upstream host owns the UIKit tab bar. Expo Router still owns its pages
// and their history. Keep one real UIKit bar and its native selection
// platter through both sizes. The React-owned scroll view drives the compact
// state; the selected UIKit placeholder does not own that scroll hierarchy.
final class FinoraCYLDockView: ExpoView, UIGestureRecognizerDelegate {
  private let bar = CYLTabBarHostView(frame: .zero)
  let onTabSelect = EventDispatcher()
  let onDockHeight = EventDispatcher()
  private var titles: [String] = []
  private var routeKey = ""
  private var scrollTarget = ""
  private var generation = 0
  private var swipeStart: Int?
  private var compactRequested = false
  private var compact = false
  private lazy var dockPan: UIPanGestureRecognizer = {
    let gesture = UIPanGestureRecognizer(target: self, action: #selector(handleDockPan(_:)))
    gesture.minimumNumberOfTouches = 1
    gesture.maximumNumberOfTouches = 1
    gesture.cancelsTouchesInView = true
    gesture.delegate = self
    return gesture
  }()
  private weak var previousPage: UIViewController?
  private weak var previousScroll: UIScrollView?
  private weak var previousController: CYLTabBarController?
  private static let reselectScrollToTop = CYLTabBarReselectBehavior(rawValue: 1 << 1)
  private static let tabs = [
    ("home", "house", "house.fill"),
    ("explore", "safari", "safari.fill"),
    ("ai", "sparkles", "sparkles"),
    ("loans", "wallet.pass", "wallet.pass.fill"),
    ("profile", "person.crop.circle", "person.crop.circle.fill")
  ]

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    bar.didSelectTab = { [weak self] index, identifier in
      guard let self, Self.tabs.indices.contains(index) else { return }
      // UIKit can report a selection without changing the host's cached index.
      // Keep the public host property and Router in agreement.
      if self.bar.selectedIndex != index { self.bar.selectedIndex = index }
      self.onTabSelect(["index": index, "identifier": identifier])
    }
    bar.preferredHeightDidChange = { [weak self] height in
      self?.onDockHeight(["height": Double(height)])
      // Keep the full-height inset stable even when the host is visually compact.
      if self?.previousScroll == nil { self?.scheduleBinding() }
    }
    addSubview(bar)
    bar.addGestureRecognizer(dockPan)
    for name in [
      UIAccessibility.voiceOverStatusDidChangeNotification,
      UIAccessibility.reduceMotionStatusDidChangeNotification,
      UIContentSizeCategory.didChangeNotification
    ] {
      NotificationCenter.default.addObserver(
        self, selector: #selector(refreshAccessibility), name: name, object: nil
      )
    }
  }

  deinit { NotificationCenter.default.removeObserver(self) }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { clearBinding() } else { scheduleBinding() }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // Assign bounds/center, not frame, while the host has a transform.
    bar.bounds = CGRect(origin: .zero, size: bounds.size)
    bar.center = CGPoint(x: bounds.midX, y: bounds.midY)
    if compact { bar.transform = compactTransform }
  }

  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    guard super.point(inside: point, with: event) else { return false }
    return !compact || bar.bounds.contains(bar.convert(point, from: self))
  }

  override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    guard gestureRecognizer === dockPan else {
      return super.gestureRecognizerShouldBegin(gestureRecognizer)
    }
    guard !UIAccessibility.isVoiceOverRunning else { return false }
    let speed = dockPan.velocity(in: bar)
    return abs(speed.x) > abs(speed.y) * 1.35
  }

  func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRequireFailureOf otherGestureRecognizer: UIGestureRecognizer
  ) -> Bool {
    // The system must get first use of its selection-lens drag. The FINORA
    // recognizer is only a fallback where UIKit doesn't claim the movement.
    guard gestureRecognizer === dockPan,
          otherGestureRecognizer is UIPanGestureRecognizer ||
            otherGestureRecognizer is UILongPressGestureRecognizer,
          let tabBar = bar.tabBarController?.tabBar,
          let view = otherGestureRecognizer.view else { return false }
    return view === tabBar || view.isDescendant(of: tabBar)
  }

  private var compactTransform: CGAffineTransform {
    let scale: CGFloat = 0.85
    let lowerAnchor = max(0, bounds.height / 2 - safeAreaInsets.bottom)
    return CGAffineTransform(translationX: 0, y: lowerAnchor * (1 - scale))
      .scaledBy(x: scale, y: scale)
  }

  func setCompact(_ requested: Bool) {
    compactRequested = requested
    let next = requested && !UIAccessibility.isVoiceOverRunning &&
      !traitCollection.preferredContentSizeCategory.isAccessibilityCategory
    guard next != compact else { return }
    compact = next
    let layout = { self.bar.transform = next ? self.compactTransform : .identity }
    if UIAccessibility.isReduceMotionEnabled || window == nil {
      UIView.performWithoutAnimation(layout)
    } else {
      UIView.animate(
        withDuration: 0.30, delay: 0, usingSpringWithDamping: 0.86, initialSpringVelocity: 0,
        options: [.beginFromCurrentState, .allowUserInteraction], animations: layout
      )
    }
  }

  @objc private func handleDockPan(_ gesture: UIPanGestureRecognizer) {
    switch gesture.state {
    case .began:
      swipeStart = bar.selectedIndex
    case .ended:
      defer { swipeStart = nil }
      let delta = gesture.translation(in: bar).x
      guard let start = swipeStart, bar.selectedIndex == start,
            abs(delta) >= max(28, bar.bounds.width / 14) else { return }
      let next = start + (delta < 0 ? 1 : -1)
      guard Self.tabs.indices.contains(next) else { return }
      // The host's property updates native selection. This explicit event
      // also reaches Expo Router when the host's stock page pan is offscreen.
      if UIAccessibility.isReduceMotionEnabled {
        setSelected(next)
      } else {
        UIView.animate(
          withDuration: 0.25, delay: 0, options: [.beginFromCurrentState, .allowUserInteraction]
        ) {
          self.setSelected(next)
          self.bar.layoutIfNeeded()
        }
      }
      onTabSelect(["index": next, "identifier": Self.tabs[next].0])
    case .cancelled, .failed:
      swipeStart = nil
    default:
      break
    }
  }

  func setSelected(_ index: Int) {
    guard Self.tabs.indices.contains(index), bar.selectedIndex != index else { return }
    bar.selectedIndex = index
    scheduleBinding()
  }

  func setRoute(_ route: String) {
    guard route != routeKey else { return }
    routeKey = route
    clearBinding()
    scheduleBinding()
  }

  func setScrollTarget(_ target: String) {
    guard target != scrollTarget else { return }
    scrollTarget = target
    clearBinding()
    scheduleBinding()
  }

  @objc private func refreshAccessibility() {
    setCompact(compactRequested)
  }

  private func clearBinding() {
    generation += 1
    if #available(iOS 26.0, *) {
      previousPage?.setContentScrollView(nil, for: .bottom)
      previousController?.cyl_reselectBehavior = []
    }
    previousController = nil
    previousPage = nil
    previousScroll = nil
  }

  private func scheduleBinding() {
    guard !scrollTarget.isEmpty else { return }
    generation += 1
    resolveBinding(generation, remaining: 14)
  }

  private func resolveBinding(_ revision: Int, remaining: Int) {
    // Briefly wait for Expo's new route and the CYL host controller to mount,
    // not for a fixed UI transition. Cancel retries when the route changes.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.045) { [weak self] in
      guard let self, self.generation == revision, let window = self.window,
            #available(iOS 26.0, *) else { return }
      guard let scroll = Self.findScroll(in: window, identifier: self.scrollTarget),
            let controller = self.bar.tabBarController,
            let page = controller.selectedViewController else {
        if remaining > 0 { self.resolveBinding(revision, remaining: remaining - 1) }
        return
      }

      if self.previousController !== controller || self.previousPage !== page ||
         self.previousScroll !== scroll {
        self.previousPage?.setContentScrollView(nil, for: .bottom)
        page.setContentScrollView(scroll, for: .bottom)
        self.previousController = controller
        self.previousPage = page
        self.previousScroll = scroll
      }
      controller.cyl_reselectBehavior = Self.reselectScrollToTop
    }
  }

  private static func findScroll(in view: UIView, identifier: String) -> UIScrollView? {
    if view.isHidden || view.alpha < 0.01 { return nil }
    if view.accessibilityIdentifier == identifier {
      return surroundingScroll(view) ?? internalScroll(view)
    }
    for child in view.subviews.reversed() {
      if let match = findScroll(in: child, identifier: identifier) { return match }
    }
    return nil
  }

  private static func surroundingScroll(_ view: UIView?) -> UIScrollView? {
    guard let view else { return nil }
    return view as? UIScrollView ?? surroundingScroll(view.superview)
  }

  private static func internalScroll(_ view: UIView) -> UIScrollView? {
    if let scroll = view as? UIScrollView { return scroll }
    for child in view.subviews {
      if let match = internalScroll(child) { return match }
    }
    return nil
  }

  func setTitles(_ newTitles: [String]) {
    guard newTitles.count == Self.tabs.count, newTitles != titles else { return }
    titles = newTitles
    clearBinding()
    let items = zip(Self.tabs, titles).map { tab, title in
      [
        "CYLTabBarItemIdentifier": tab.0, "CYLTabBarItemTitle": title,
        "CYLTabBarItemImage": "system:" + tab.1, "CYLTabBarItemSelectedImage": "system:" + tab.2
      ]
    }
    bar.configuration = [
      "CYLTabBarControllerStyleType": "liquidGlass",
      "CYLTabBarControllerSwipeToSwitchTab": false,
      "CYLTabBarControllerTabButtonTapAnimation": UIAccessibility.isReduceMotionEnabled ? "none" : "scale",
      "CYLTabBarControllerTabBarItemsAttributes": items
    ]
    scheduleBinding()
  }
}
