use chrono::{DateTime, Local};
use std::{
    fs::{self, OpenOptions},
    io::{ErrorKind, Write},
    path::{Path, PathBuf},
};

pub fn photo_filename(now: DateTime<Local>) -> String {
    format!("mirror-{}.png", now.format("%Y%m%d-%H%M%S"))
}

fn available_photo_path(mirror_dir: &Path, now: DateTime<Local>) -> PathBuf {
    let filename = photo_filename(now);
    let photo_path = mirror_dir.join(&filename);
    if !photo_path.exists() {
        return photo_path;
    }

    let stem = filename
        .strip_suffix(".png")
        .expect("generated photo filename should end in .png");
    let mut suffix = 1;
    loop {
        let photo_path = mirror_dir.join(format!("{stem}-{suffix}.png"));
        if !photo_path.exists() {
            return photo_path;
        }
        suffix += 1;
    }
}

fn save_photo_to(
    pictures_dir: &Path,
    png_bytes: &[u8],
    now: DateTime<Local>,
) -> Result<PathBuf, String> {
    if png_bytes.is_empty() {
        return Err("The captured photo was empty.".to_string());
    }

    let mirror_dir = pictures_dir.join("Mirror");
    fs::create_dir_all(&mirror_dir)
        .map_err(|error| format!("Failed to create the Mirror photo folder: {error}"))?;

    loop {
        let photo_path = available_photo_path(&mirror_dir, now);
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&photo_path)
        {
            Ok(mut photo) => {
                photo
                    .write_all(png_bytes)
                    .map_err(|error| format!("Failed to write the captured photo: {error}"))?;
                return Ok(photo_path);
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {}
            Err(error) => return Err(format!("Failed to save the captured photo: {error}")),
        }
    }
}

#[tauri::command]
pub fn save_photo(png_bytes: Vec<u8>) -> Result<String, String> {
    let pictures_dir =
        dirs::picture_dir().ok_or_else(|| "Windows Pictures folder was not found.".to_string())?;
    let saved_path = save_photo_to(&pictures_dir, &png_bytes, Local::now())?;

    Ok(saved_path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::{available_photo_path, photo_filename, save_photo_to};
    use chrono::{DateTime, Local, TimeZone};
    use std::{
        fs,
        path::{Path, PathBuf},
        process,
        time::{SystemTime, UNIX_EPOCH},
    };

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new() -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock should be after the Unix epoch")
                .as_nanos();
            let path =
                std::env::temp_dir().join(format!("mirror-photo-test-{}-{nanos}", process::id()));
            fs::create_dir(&path).expect("test directory should be created");

            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            if self.path.exists() {
                fs::remove_dir_all(&self.path).expect("owned test directory should be removed");
            }
        }
    }

    fn fixed_now() -> DateTime<Local> {
        Local
            .with_ymd_and_hms(2026, 6, 3, 12, 34, 56)
            .single()
            .expect("fixed local datetime should be valid")
    }

    #[test]
    fn formats_photo_filename_from_local_datetime() {
        assert_eq!(photo_filename(fixed_now()), "mirror-20260603-123456.png");
    }

    #[test]
    fn rejects_empty_photo_bytes() {
        let pictures_dir = TestDir::new();

        assert_eq!(
            save_photo_to(pictures_dir.path(), &[], fixed_now()).unwrap_err(),
            "The captured photo was empty."
        );
    }

    #[test]
    fn adds_suffix_when_timestamped_photo_exists() {
        let pictures_dir = TestDir::new();
        let mirror_dir = pictures_dir.path().join("Mirror");
        fs::create_dir(&mirror_dir).expect("Mirror directory should be created");
        fs::write(
            mirror_dir.join(photo_filename(fixed_now())),
            b"existing photo",
        )
        .expect("existing photo should be written");

        assert_eq!(
            available_photo_path(&mirror_dir, fixed_now()),
            mirror_dir.join("mirror-20260603-123456-1.png")
        );
    }

    #[test]
    fn saves_photo_bytes_in_mirror_directory() {
        let pictures_dir = TestDir::new();

        let saved_path = save_photo_to(pictures_dir.path(), b"png bytes", fixed_now())
            .expect("photo should be saved");

        assert_eq!(
            saved_path,
            pictures_dir
                .path()
                .join("Mirror/mirror-20260603-123456.png")
        );
        assert_eq!(
            fs::read(saved_path).expect("saved photo should be readable"),
            b"png bytes"
        );
    }
}
