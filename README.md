# BigQuery Release Notes Hub & Tweet Composer

A premium Flask-based web application that fetches the latest BigQuery release notes and feeds them into a fully interactive Tweet Composer.

## Features

- **Live XML Feed Fetching**: Parses the live Atom feed from Google Cloud.
- **Smart Parsing**: Automatically categorizes updates into `Features`, `Issues`, `Announcements`, and `Deprecations`.
- **Intelligent Local Caching**: Caches notes for 1 hour to ensure lightning-fast loads, with a manual **Refresh** button that triggers a direct feed fetch.
- **Live Search & Category Filtering**: Instantly search updates with keyword highlighting. Filter notes using interactive chips.
- **Dynamic Tweet Composer**:
  - Automatically builds tweets from a selected release item.
  - Smart character limit counter that conforms to X/Twitter rules (accounting for URLs counting as exactly 23 characters).
  - Circular progress ring indicating remaining character capacity (turns yellow at 250 characters, red if exceeding 280).
  - Quick hashtag toggle helper chips.
  - Direct integration to publish on X via Twitter intent sharing.
- **Vibrant Modern Dark Theme**: Built using beautiful modern glassmorphism design tokens, CSS blur filters, glowing borders, custom fonts, animations, and loading skeleton state.

## Getting Started

### Prerequisites

- Python 3.8 or higher

### Installation

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
