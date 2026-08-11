/*
  Side-effect module: set DEDECEL_NO_LISTEN=1 BEFORE the server module is imported.

  WHY A SEPARATE FILE: ES module `import` statements are hoisted and evaluated in source order,
  but always BEFORE the importing module's own statement body runs. If api/index.ts set the env
  var in its body and then `import`ed server.js, the import would run FIRST and server.ts would
  already have decided to call app.listen() (fatal in a serverless function).

  By importing THIS module before server.js, its top-level assignment runs first — guaranteed —
  so server.ts sees the flag and skips listen().
*/
process.env.DEDECEL_NO_LISTEN = '1';
export {};
