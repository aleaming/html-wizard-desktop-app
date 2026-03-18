# Agent Group F: Integration Tasks (Sequential)

You are the Integration Agent. You run AFTER all 5 parallel builder agents complete. Your job is to wire their code together, fix any cross-module issues, and verify the full build pipeline works.

## You may modify these files (created by other agents):
- `src-tauri/src/main.rs` (add command registrations, fix imports)
- `src-tauri/src/lib.rs` (fix module declarations if needed)
- `src-tauri/src/commands/mod.rs` (fix re-exports if needed)

## You should NOT create new files or rewrite existing files from scratch.

---

## Task F-1: Wire Rust Commands into Tauri Builder

### Check and fix `src-tauri/src/main.rs`:

1. Verify AppState struct exists with:
   - `path_validator: Mutex<Option<PathValidator>>`
   - `project_root: Mutex<Option<String>>`

2. Verify ALL these commands are in `generate_handler![]`:
   ```rust
   generate_handler![
       // File operations (Group B)
       commands::file_ops::read_file,
       commands::file_ops::write_file,
       commands::file_ops::create_file,
       commands::file_ops::delete_file,
       commands::file_ops::list_directory,
       commands::file_ops::log_from_frontend,
       // Project operations (Group B)
       commands::project::open_project,
       commands::project::scan_directory,
       // Credentials (Group C)
       commands::credentials::store_api_key,
       commands::credentials::get_api_key,
       commands::credentials::delete_api_key,
       commands::credentials::test_api_key,
       // AI (Group C)
       commands::ai_provider::send_ai_request,
       commands::ai_provider::list_providers,
       // Image (Group C)
       commands::image::upload_image,
       commands::image::link_image_url,
       commands::image::generate_image,
   ]
   ```

3. Verify `.manage(AppState::default())` is called on the Tauri builder

4. Verify plugin registrations:
   ```rust
   .plugin(tauri_plugin_fs::init())
   .plugin(tauri_plugin_http::init())
   ```

5. Fix any import paths that don't resolve

---

## Task F-2: Verify Full Build Pipeline

### Run these checks in order:

1. **npm install** — install all frontend dependencies
   - If there are version conflicts, resolve them
   - If packages are missing, add them to package.json

2. **cargo check** (in src-tauri/) — verify Rust compilation
   - Fix any type mismatches between modules
   - Fix any missing imports
   - Fix any trait implementation issues
   - Ensure all `#[tauri::command]` functions compile

3. **Verify TypeScript compiles**:
   - Check that frontend types match what Rust commands expect
   - Check that store slices import correctly
   - Check that hooks import from correct paths

### Common Integration Issues to Check:
- Module paths: `crate::commands::file_ops` vs `commands::file_ops`
- Serde field naming: Rust uses snake_case, Tauri converts to camelCase
- State access: `State<'_, AppState>` parameter in commands
- Async: All commands should be `async` with `#[tauri::command]`

### Report what you fixed:
List every file modified and what was changed.
