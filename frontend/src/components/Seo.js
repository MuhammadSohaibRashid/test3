import React, { useState, useEffect } from "react";
import "./Seo.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faClosedCaptioning, faSearch, faImage } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

function SEO({ videoThumbnail, videoId }) {
  const [activeTab, setActiveTab] = useState("Keywords");
  const [seoData, setSeoData] = useState("");

  // Fetch SEO data dynamically based on the active tab
  const fetchSEOData = async (type) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/seo-data/${videoId}/${type.toLowerCase()}/`);
      setSeoData(response.data[type.toLowerCase()] || "No data available for this section.");
    } catch (error) {
      console.error("Error fetching SEO data:", error);
      setSeoData("Failed to fetch data. Please try again later.");
    }
  };

  // Fetch SEO data when activeTab changes
  useEffect(() => {
    fetchSEOData(activeTab);
  }, [activeTab]);

  return (
    <div className="seo-app">
      {/* Header Section */}
      <header className="header">
        <h1 className="logo">
          <span className="bold">Channel-</span>
          <span className="highlight">IQ</span>
        </h1>
        <nav className="nav">
          <a href="#clipper">Clipper</a>
          <a href="#seo">SEO</a>
          <a href="#thumbnail">Thumbnail</a>
          <a href="#pricing">Pricing</a>
          <button className="sign-in">Sign in</button>
          <button className="sign-up">Sign up</button>
        </nav>
      </header>

      {/* Main Content Section */}
      <main className="main-content">
        {/* Navigation to Clipper */}
        <button className="clipper-btn">Go to Clipper</button>

        {/* Clip Section */}
        <div className="clip-section">
          {/* Image Preview */}
          <div className="image-preview">
            <img
              src={videoThumbnail || "https://via.placeholder.com/300x300"}
              alt="Video Thumbnail"
              className="preview-image"
            />
          </div>

          {/* Clip Customization */}
          <div className="customize-clip">
            {/* Menu for Options */}
            <div className="menu">
              <button
                className={activeTab === "Keywords" ? "active" : ""}
                onClick={() => setActiveTab("Keywords")}
              >
                <FontAwesomeIcon icon={faFileLines} /> Keywords
              </button>
              <button
                className={activeTab === "Description" ? "active" : ""}
                onClick={() => setActiveTab("Description")}
              >
                <FontAwesomeIcon icon={faClosedCaptioning} /> Description
              </button>
              <button
                className={activeTab === "Title" ? "active" : ""}
                onClick={() => setActiveTab("Title")}
              >
                <FontAwesomeIcon icon={faSearch} /> Title
              </button>
              <button
                className={activeTab === "Tags" ? "active" : ""}
                onClick={() => setActiveTab("Tags")}
              >
                <FontAwesomeIcon icon={faImage} /> Tags
              </button>
            </div>

            {/* Transcript Box */}
            <div className="transcript-box">
              <p>{seoData}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SEO;
