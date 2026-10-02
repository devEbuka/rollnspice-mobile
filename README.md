# Roll N Spice mobile

## Live menu setup

The Home screen reads the existing Supabase products table using its public read policy. Prices are stored in kobo and displayed in naira. Loading, empty menu, network timeout, and retry states are included. Authentication and ordering are separate tasks.

Copy `.env.example` to `.env.local` and fill in the existing project's Supabase URL and publishable key. Local configuration is ignored by Git. Only these two public values belong here; never copy the website's complete environment file or any Supabase secret/service-role or Mailgun key.

In Git Bash:

```bash
cd /c/rollnspice-mobile
npm start
```

Open the menu in Expo Go on Android. Fully reload the app after configuring environment variables. Run `npm run lint`, `npm run typecheck`, and `npm run test:auth` for code checks.

## Google sign-in development setup

Google sign-in requires an installed development build. Expo Go can still preview the menu, but cannot handle this app's custom login callback. Account controls are on the About tab. Native sessions persist in AsyncStorage; refresh runs while the app is active. Sign-out applies to this device.

In the existing Supabase project's Authentication URL Configuration, add `rollnspicemobile://explore?sb_flow_id=*` to Redirect URLs, preserving the existing website settings. The query wildcard allows the unique PKCE flow identifier generated for each login. Google is already enabled on the shared project. The app uses the pinned Supabase client's experimental flow-ID redirect option; review this option when upgrading that dependency.

In Git Bash, sign in to your Expo account, then build:

```bash
cd /c/rollnspice-mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

EAS may prompt to create/link the Expo project and generate Android signing credentials. Install the resulting APK on the phone, then run:

```bash
npx expo start --dev-client
```

Keep this server running during development. Test Google login, cancellation, app restart/session restoration, background/foreground refresh, and sign-out. Also test returning from Google after the app has been closed. These device checks remain pending; static checks and callback tests cannot establish that the complete Google flow works.

The remaining content below is the original Expo starter documentation.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
