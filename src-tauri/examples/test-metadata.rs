use std::env;
use std::process::Command;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage: {} <file_path>", args[0]);
        return;
    }

    let file_path = &args[1];
    
    // Use ffprobe directly
    let output = Command::new("../ffprobe")
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration:stream=width,height,codec_name",
            "-of", "json",
            file_path
        ])
        .output()
        .expect("Failed to execute FFprobe");
    
    if output.status.success() {
        println!("FFprobe output: {}", String::from_utf8_lossy(&output.stdout));
    } else {
        println!("Error: {}", String::from_utf8_lossy(&output.stderr));
    }
}
