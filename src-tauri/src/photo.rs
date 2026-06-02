use chrono::{DateTime, Local};
use std::{
    fs::{self, OpenOptions},
    io::{self, ErrorKind, Write},
    path::{Path, PathBuf},
};

pub fn photo_filename(now: DateTime<Local>) -> String {
    format!("mirror-{}.png", now.format("%Y%m%d-%H%M%S"))
}

fn save_photo_to_with_writer(
    pictures_dir: &Path,
    png_bytes: &[u8],
    now: DateTime<Local>,
    write_photo: impl FnOnce(&mut fs::File) -> io::Result<()>,
) -> Result<PathBuf, String> {
    if png_bytes.is_empty() {
        return Err("The captured photo was empty.".to_string());
    }

    let mirror_dir = pictures_dir.join("Mirror");
    fs::create_dir_all(&mirror_dir)
        .map_err(|error| format!("Failed to create the Mirror photo folder: {error}"))?;

    let filename = photo_filename(now);
    let stem = filename
        .strip_suffix(".png")
        .expect("generated photo filename should end in .png");

    for suffix in 0.. {
        let photo_path = if suffix == 0 {
            mirror_dir.join(&filename)
        } else {
            mirror_dir.join(format!("{stem}-{suffix}.png"))
        };
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&photo_path)
        {
            Ok(mut photo) => {
                if let Err(error) = write_photo(&mut photo) {
                    drop(photo);
                    let _ = fs::remove_file(&photo_path);
                    return Err(format!("Failed to write the captured photo: {error}"));
                }
                return Ok(photo_path);
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {}
            Err(error) => return Err(format!("Failed to save the captured photo: {error}")),
        }
    }

    unreachable!("photo suffix range should not be exhausted")
}

fn save_photo_to(
    pictures_dir: &Path,
    png_bytes: &[u8],
    now: DateTime<Local>,
) -> Result<PathBuf, String> {
    save_photo_to_with_writer(pictures_dir, png_bytes, now, |photo| {
        photo.write_all(png_bytes)
    })
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
    use super::{photo_filename, save_photo_to, save_photo_to_with_writer};
    use chrono::{DateTime, Local, TimeZone};
    use std::{
        fs, io,
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
                let _ = fs::remove_dir_all(&self.path);
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
    fn saves_with_suffix_without_overwriting_existing_photo() {
        let pictures_dir = TestDir::new();
        let mirror_dir = pictures_dir.path().join("Mirror");
        fs::create_dir(&mirror_dir).expect("Mirror directory should be created");
        let original_path = mirror_dir.join(photo_filename(fixed_now()));
        fs::write(&original_path, b"original bytes").expect("existing photo should be written");

        let saved_path = save_photo_to(pictures_dir.path(), b"new bytes", fixed_now())
            .expect("photo should be saved with a suffix");

        assert_eq!(saved_path, mirror_dir.join("mirror-20260603-123456-1.png"));
        assert_eq!(
            fs::read(original_path).expect("original photo should be readable"),
            b"original bytes"
        );
        assert_eq!(
            fs::read(saved_path).expect("suffixed photo should be readable"),
            b"new bytes"
        );
    }

    #[test]
    fn removes_created_photo_when_write_fails() {
        let pictures_dir = TestDir::new();
        let expected_path = pictures_dir
            .path()
            .join("Mirror/mirror-20260603-123456.png");

        let error =
            save_photo_to_with_writer(pictures_dir.path(), b"png bytes", fixed_now(), |_| {
                Err(io::Error::other("forced write failure"))
            })
            .unwrap_err();

        assert_eq!(
            error,
            "Failed to write the captured photo: forced write failure"
        );
        assert!(!expected_path.exists());
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
