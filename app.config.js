const appJson = require("./app.json");

/** @type {import('expo/config').ConfigContext} */
module.exports = () => {
  const expo = appJson.expo;
  const useStaticWeb =
    process.env.EXPO_STATIC_EXPORT === "1" ||
    process.env.EXPO_USE_STATIC_WEB === "1" ||
    process.argv.some((arg) => /\bexport\b/.test(arg));

  const plugins = expo.plugins.map((plugin) => {
    if (plugin === "expo-router") {
      return ["expo-router", { asyncRoutes: false }];
    }
    return plugin;
  });

  return {
    expo: {
      ...expo,
      web: {
        ...expo.web,
        bundler: "metro",
        // "static" pre-renders every route at dev start (N parallel bundles + premature close).
        // Use single SPA graph for dev; static is auto-enabled for `expo export`.
        output: useStaticWeb ? "static" : "single",
      },
      plugins,
      extra: {
        ...expo.extra,
        router: {
          ...expo.extra?.router,
          asyncRoutes: false,
        },
      },
    },
  };
};
