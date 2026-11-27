Pod::Spec.new do |s|
  s.name = 'FinoraCYLDock'
  s.version = '0.0.1'
  s.summary = 'Development-only FINORA dock comparison'
  s.homepage = 'https://github.com/teehihi/finora'
  s.license = { :type => 'Proprietary' }
  s.author = 'FINORA'
  s.source = { :git => 'https://github.com/teehihi/finora.git' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.source_files = '*.swift'
  s.dependency 'ExpoModulesCore'
  s.dependency 'CYLTabBarController/Core'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
