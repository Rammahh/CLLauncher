mod commands;
mod error;
mod java;
mod minecraft;
mod accounts;
#[cfg(test)]
mod tests;

pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Config
            commands::config::get_app_data_dir,
            commands::config::read_launcher_config,
            commands::config::write_launcher_config,
            commands::config::read_instance_config,
            commands::config::write_instance_config,
            commands::config::list_instances,
            commands::config::delete_instance,
            commands::config::get_instance_size,
            commands::config::open_instance_folder,
            // Downloads
            commands::download::download_file,
            commands::download::verify_sha256,
            commands::download::cancel_download,
            // Java
            commands::java::detect_java_installations,
            commands::java::get_java_version,
            commands::java::find_best_java,
            // Launch
            commands::launch::launch_minecraft,
            commands::launch::kill_minecraft,
            commands::launch::get_minecraft_status,
            // Accounts
            commands::accounts::load_accounts,
            commands::accounts::save_account,
            commands::accounts::delete_account,
            commands::accounts::refresh_microsoft_token,
            commands::accounts::start_microsoft_auth,
            commands::accounts::start_microsoft_auth_browser,
            commands::accounts::poll_microsoft_token,
            commands::accounts::load_account_with_tokens_cmd,
            // Filesystem
            commands::fs::read_file_text,
            commands::fs::write_file_text,
            commands::fs::file_exists,
            commands::fs::delete_file,
            commands::fs::create_dir_all,
            commands::fs::list_dir,
            commands::fs::copy_file,
            commands::fs::move_file,
            // Logs
            commands::logs::get_log_files,
            commands::logs::read_log_file,
            commands::logs::clear_log,
            commands::logs::export_logs_zip,
            commands::logs::open_logs_folder,
            // Manifest
            commands::manifest::install_modpack,
            commands::manifest::install_modpack_archive,
            commands::manifest::repair_modpack,
            commands::manifest::validate_manifest_path,
            commands::manifest::read_install_state,
            commands::manifest::write_install_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
