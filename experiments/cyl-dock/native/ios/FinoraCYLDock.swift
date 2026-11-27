import CYLTabBarController
import ExpoModulesCore
import UIKit

public final class FinoraCYLDockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FinoraCYLDock")
    View(FinoraCYLDockView.self) {
      Events("onTabSelect", "onDockHeight")
      Prop("titles") { (view, titles: [String]) in
        view.setTitles(titles)
      }
      Prop("selectedIndex") { (view, index: Int) in
        if (0..<5).contains(index) { view.bar.selectedIndex = index }
      }
      Prop("dark") { (view, dark: Bool) in
        view.overrideUserInterfaceStyle = dark ? .dark : .light
      }
    }
  }
}

// This host is also what the upstream Fabric component puts on screen. It owns
// the bar only: Expo Router, not the native placeholder pages, owns navigation.
final class FinoraCYLDockView: ExpoView {
  let bar = CYLTabBarHostView(frame: .zero)
  let onTabSelect = EventDispatcher()
  let onDockHeight = EventDispatcher()
  private var titles: [String] = []
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
      self?.onTabSelect(["index": index, "identifier": identifier])
    }
    bar.preferredHeightDidChange = { [weak self] height in
      self?.onDockHeight(["height": Double(height)])
    }
    addSubview(bar)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    bar.frame = bounds
  }

  func setTitles(_ newTitles: [String]) {
    guard newTitles.count == Self.tabs.count, newTitles != titles else { return }
    titles = newTitles
    let items = zip(Self.tabs, titles).map { tab, title in
      [
        "CYLTabBarItemIdentifier": tab.0, "CYLTabBarItemTitle": title,
        "CYLTabBarItemImage": "system:" + tab.1, "CYLTabBarItemSelectedImage": "system:" + tab.2
      ]
    }
    bar.configuration = [
      "CYLTabBarControllerStyleType": "liquidGlass",
      "CYLTabBarControllerSwipeToSwitchTab": true,
      "CYLTabBarControllerTabBarItemsAttributes": items
    ]
  }
}
