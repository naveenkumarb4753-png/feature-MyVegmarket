/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const useStaticWeb =
    process.env.EXPO_STATIC_EXPORT === "1" ||
    process.env.EXPO_USE_STATIC_WEB === "1" ||
    process.argv.some((arg) => /\bexport\b/.test(arg));

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (plugin === "expo-router") {
      return ["expo-router", { asyncRoutes: false }];
    }

    if (Array.isArray(plugin) && plugin[0] === "expo-router") {
      return ["expo-router", { asyncRoutes: false }];
    }

    return plugin;
  });

  return {
    ...config,

    web: {
      ...config.web,
      bundler: "metro",
      output: useStaticWeb ? "static" : "single",
    },

    plugins,

    extra: {
      ...config.extra,
      router: {
        ...(config.extra?.router ?? {}),
        asyncRoutes: false,
      },
    },
  };
};