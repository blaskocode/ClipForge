use clipforge_lib::validate_video_file_internal;
use std::env;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage: {} <file_path>", args[0]);
        return;
    }

    let file_path = &args[1];
    match validate_video_file_internal(file_path.clone()).await {
        Ok(result) => println!("Valid: {}", result),
        Err(err) => println!("Error: {}", err),
    }
}
