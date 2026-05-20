/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://quasar.dev/quasar-cli/quasar-conf-js

const { defineConfig } = require('@quasar/app-webpack/wrappers')
const path = require('path')
const { execSync } = require('child_process')
const webpack = require('webpack')
const { getElectronReleaseRepo } = require('./build/release-config.cjs')

const appVersion = require('./package.json').version
const appBuild = execSync('git --no-pager log -n 1 --date=short --pretty="%ad.%h"')
  .toString('utf8')
  .replace(/-/g, '.')
  .trim()
const electronBuildArches = (process.env.ELECTRON_BUILD_ARCHES || 'x64,arm64')
  .split(',')
  .map(arch => arch.trim())
  .filter(Boolean)
const electronMacTarget = process.env.ELECTRON_MAC_TARGET || 'default'
const electronReleaseRepo = getElectronReleaseRepo(process.env)

module.exports = defineConfig(function (ctx) {
  return {
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/cli-documentation/boot-files
    boot: [
      'i18n',
      'axios',
      'misc',
      'directives',
      'services'
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: [
      'app.sass'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v4',
      // 'fontawesome-v5',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      // 'roboto-font', // optional, you are not bound to it
      'material-icons' // optional, you are not bound to it
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      iconSet: 'material-icons', // Quasar icon set
      lang: 'en-US', // Quasar language pack
      config: {
        loadingBar: {
            skipHijack: true
        }
      },

      // Possible values for "all":
      // * 'auto' - Auto-import needed Quasar components & directives
      //            (slightly higher compile time; next to minimum bundle size; most convenient)
      // * false  - Manually specify what to import
      //            (fastest compile time; minimum bundle size; most tedious)
      // * true   - Import everything from Quasar
      //            (not treeshaking Quasar; biggest bundle size; convenient)
      all: false,

      components: [
        "QAvatar",
        "QBadge",
        "QBtn",
        "QItem",
        "QItemSection",
        "QItemLabel",
        "QExpansionItem",
        "QImg",
        "QIcon",
        "QToolbar",
        "QToolbarTitle",
        "QList",
        "QResizeObserver",
        "QSeparator",
        "QCard",
        "QCardSection",
        "QCardActions",
        "QPopupProxy",
        "QBanner",
        "QSlideTransition",
        "QResponsive",
        "QDialog",
        "QInput",
        "QForm",
        "QTabs",
        "QTab",
        "QTabPanels",
        "QTabPanel",
        "QToggle",
        "QSpinnerDots",
        "QSpinner",
        "QInfiniteScroll",
        "QChip",
        "QCarousel",
        "QCarouselSlide",
        "QCheckbox",
        "QOptionGroup"
      ],
      directives: [
        "TouchPan",
        "Intersection",
        "ClosePopup"
      ],

      // Quasar plugins
      plugins: [
          "Dialog",
          "Notify"
      ]
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      env: {
          APP_VERSION: appVersion,
          APP_BUILD: appBuild,
          DIST_TAG: process.env.DIST_TAG || ''
      },
      vueRouterMode: 'hash', // available values: 'hash', 'history'
      vueOptionsAPI: true,
      typescript: {
        strict: false,
        vueShim: true
      },

      // rtl: false, // https://quasar.dev/options/rtl-support
      // showProgress: false,
      // gzip: true,
      // analyze: true,

      // Options below are automatically set depending on the env, set them if you want to override
      // preloadChunks: false,
      // extractCSS: false,

      sassLoaderOptions: {
        implementation: require('sass'),
        sassOptions: {
          indentedSyntax: true,
          quietDeps: true,
          outputStyle: 'expanded'
        }
      },
      scssLoaderOptions: {
        implementation: require('sass'),
        sassOptions: {
          quietDeps: true,
          outputStyle: 'expanded'
        }
      },

      // https://quasar.dev/quasar-cli/cli-documentation/handling-webpack
      extendWebpack(cfg) {
        const CopyWebpackPlugin = require('copy-webpack-plugin')

        cfg.output = cfg.output || {}
        cfg.output.hashFunction = 'sha256'

        cfg.resolve.alias = {
          ...cfg.resolve.alias,
          core: path.resolve(__dirname, './src/core'),
          'thor-devkit$': path.resolve(__dirname, './node_modules/thor-devkit/dist/index.js'),
          '@noble/curves/secp256k1$': path.resolve(__dirname, './node_modules/@noble/curves/esm/secp256k1.js')
        }
        cfg.resolve.fallback = {
          ...cfg.resolve.fallback,
          buffer: require.resolve('buffer/'),
          crypto: require.resolve('crypto-browserify'),
          fs: false,
          http: require.resolve('stream-http'),
          https: require.resolve('https-browserify'),
          process: require.resolve('process/browser'),
          stream: require.resolve('stream-browserify'),
          url: require.resolve('url/'),
          vm: false
        }

        cfg.module.rules.push({
          test: /\.js$/,
          include: [
            path.resolve(__dirname, './node_modules/@noble/curves/esm')
          ],
          use: {
            loader: 'babel-loader',
            options: {
              compact: false,
              extends: path.resolve(__dirname, './babel.config.js')
            }
          }
        })

        if (ctx.mode.electron) {
          cfg.externals = cfg.externals || {}
          for (const pkg of [
            '@electron/remote',
            '@ledgerhq/hw-transport-node-hid-noevents',
            'electron',
            'node-hid'
          ]) {
            cfg.externals[pkg] = `commonjs ${pkg}`
          }
        }

        const copyPatterns = [{
          from: path.join(__dirname, 'src/statics'),
          to: 'statics',
          noErrorOnMissing: true
        }]
        cfg.plugins.push(
          new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: ['process']
          }),
          new CopyWebpackPlugin({ patterns: copyPatterns })
        )
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      https: false,
      port: 8080,
      open: true // opens browser window automatically
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: [],

    // https://quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      pwa: false
    },

    // https://quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      extendGenerateSWOptions(config) {
        Object.assign(config, {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [{
            urlPattern: /^https:\/\/vechain.github.io\/token-registry\/assets\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'token-icons',
              cacheableResponse: {statuses: [0, 200]}
            }
          }]
        })
      }
    },
    sourceFiles : {
      electronMain: 'src-electron/main-process/electron-main'
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
      id: 'org.vechain.sync2'
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

	    // Full list of options: https://quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
	    electron: {
	      bundler: 'builder', // 'packager' or 'builder'
	      preloadScripts: [],

	      builder: {
        // https://www.electron.build/configuration/configuration
        productName: 'Sync2',
        appId: 'org.vechain.sync2',
        artifactName: '${productName}-${os}-${arch}-${version}.${ext}',
        publish: [{
          provider: 'github',
          owner: electronReleaseRepo.owner,
          repo: electronReleaseRepo.repo
        }],
        protocols: {
            name: 'VeChain Connex',
            schemes: ['connex']
        },
        win: {
          target: {
            arch: electronBuildArches,
            target: 'nsis'
          }
        },
        linux: {
          target: {
            arch: electronBuildArches,
            target: 'AppImage'
          }
        },
        afterSign: "build/notarize.js",
        mac: {
          icon: 'src-electron/icons/icon.icns',
          hardenedRuntime: true,
          entitlements: "build/entitlements.mac.plist",
          entitlementsInherit: "build/entitlements.mac.plist",
          target: {
            arch: electronBuildArches,
            target: electronMacTarget
          }
        }
      },

      unPackagedInstallParams: []
    }
  }
})
