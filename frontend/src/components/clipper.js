import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { fetchVideoMetadata, downloadAndUploadVideo } from "../axios-use/api";
import "./clipper.css";

function Clipper() {
    const [videoURL, setVideoURL] = useState("");
    const [videoData, setVideoData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [optimizationType, setOptimizationType] = useState("");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [clipLength, setClipLength] = useState("90s");
    const [clipCount, setClipCount] = useState(1);

    const navigate = useNavigate();

    // Fetch video metadata and initiate download/upload
    const handleFetch = async () => {
        setLoading(true);
        setError(null);
        setVideoData(null);

        if (!videoURL.trim()) {
            setError("Please enter a valid YouTube URL.");
            setLoading(false);
            return;
        }

        try {
            const data = await fetchVideoMetadata(videoURL);
            setVideoData(data);

            const downloadResponse = await downloadAndUploadVideo(videoURL);
            console.log("Video download and upload response:", downloadResponse);
        } catch (err) {
            setError(err.response?.data?.error || "Error fetching video. Please try again.");
            console.error("Error during fetch:", err);
        } finally {
            setLoading(false);
        }
    };

    // Handle optimization type selection
    const handleOptimizationTypeChange = (type) => {
        setOptimizationType(type);
        setAspectRatio(type === "Long Form" ? "16:9" : "9:16");
    };

    // Handle video generation
    const handleGenerateClick = async () => {
        if (!videoData) {
            alert("Please fetch video data before generating.");
            return;
        }

        const payload = {
            videoURL,  // Ensure the video URL is included
            optimizationType,
            aspectRatio,
            clipLength,
            clipCount,
        };

        try {
            console.log("Payload:", payload);
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("csrftoken"))
                ?.split("=")[1];

            const response = await axios.post(
                "http://127.0.0.1:8000/api/generate-video/",  // Adjust URL as needed
                payload,
                {
                    headers: {
                        "X-CSRFToken": csrfToken,
                        "Content-Type": "application/json",  // Specify content type
                    },
                }
            );

            alert(response.data.message || "Video generation started!");

            // Navigate to the SEO page with video and SEO data
            navigate("/seo", { state: { videoData, seoData: response.data } });
        } catch (err) {
            console.error("Error generating video:", err);
            alert(err.response?.data?.error || "Error during video generation. Please try again.");
        }
    };

    return (
        <div className="clipper-container">
            <h1>YouTube Video Clipper</h1>

            {/* Input for YouTube URL */}
            <div className="url-input-container">
                <input
                    type="text"
                    placeholder="Enter YouTube URL"
                    value={videoURL}
                    onChange={(e) => setVideoURL(e.target.value)}
                    className="url-input"
                />
                <button onClick={handleFetch} disabled={loading} className="fetch-btn">
                    {loading ? "Fetching..." : "Fetch Video"}
                </button>
            </div>

            {/* Display Errors */}
            {error && <p className="error-message">{error}</p>}

            {/* Video Preview */}
            {videoData && (
                <div className="video-preview-container">
                    <h2>{videoData.title}</h2>
                    <img
                        src={videoData.thumbnail}
                        alt="Video Thumbnail"
                        className="video-thumbnail"
                    />
                </div>
            )}

            {/* Optimization Type Selection */}
            <div className="optimization-type">
                <h3>Choose Optimization Type:</h3>
                <button
                    className={optimizationType === "Long Form" ? "active" : ""}
                    onClick={() => handleOptimizationTypeChange("Long Form")}
                >
                    Long Form
                </button>
                <button
                    className={optimizationType === "Short Form" ? "active" : ""}
                    onClick={() => handleOptimizationTypeChange("Short Form")}
                >
                    Short Form
                </button>
            </div>

            {/* Settings */}
            {optimizationType && (
                <div className="settings-container">
                    {optimizationType === "Long Form" ? (
                        <div>
                            <h4>Choose Features:</h4>
                            <div className="features">
                                <button>Noise Reduction</button>
                                <button>Video Quality</button>
                                <button>Captions</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label>Clip Length:</label>
                            <select
                                value={clipLength}
                                onChange={(e) => setClipLength(e.target.value)}
                            >
                                <option value="90s">90s</option>
                                <option value="60s">60s</option>
                                <option value="30s">30s</option>
                            </select>

                            <label>Number of Clips:</label>
                            <div className="clip-count">
                                {[1, 2, 3, 4].map((count) => (
                                    <button
                                        key={count}
                                        className={clipCount === count ? "active" : ""}
                                        onClick={() => setClipCount(count)}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>

                            <label>Aspect Ratio:</label>
                            <select
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                            >
                                <option value="9:16">9:16</option>
                                <option value="16:9">16:9</option>
                                <option value="4:3">4:3</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Generate Button */}
            <div className="generate-btn">
                <button
                    onClick={handleGenerateClick}
                    disabled={!optimizationType || !videoData}
                >
                    Generate
                </button>
            </div>
        </div>
    );
}

export default Clipper;
