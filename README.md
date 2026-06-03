# FluxFlow

FluxFlow is a comprehensive asset management system designed for tracking and managing assets in various environments. The system supports scanning of QR codes for both assets and storage rooms, providing detailed information about each item.

### Features

- **QR Code Scanning**: Scan QR codes to quickly access asset and room information
- **Asset Management**: Track assets with detailed information including serial numbers, status, and maintenance intervals
- **Room Management**: Manage storage rooms with location details and GPS coordinates
- **Recent Scans**: View a history of recently scanned items
- **_Multi-language Support_**: Internationalization support for different languages

### Installation

1. Clone the repository:

`git clone https://github.com/yourusername/fluxflow.git`

2. Install dependencies:

`npm install`

3. Run the development server:

`npm run dev`

### Usage

1. **Scanning**:

- Open the scanner page
- Point your device's camera at a QR code
- The system will automatically detect and display information about the scanned item

2. **Viewing Details**:

- After scanning, detailed information about the asset or room will be displayed
- For assets, you can view history and maintenance information
- For rooms, you can see location details and GPS coordinates

3. **Recent Scans**:

- View a list of recently scanned items
- Click on any item to quickly access its details

### Project Structure

The project follows a standard Vue.js structure with the following key components:

- **ScannerPage.vue**: Main scanning interface with camera functionality
- **ScannerDetailView.vue**: Displays detailed information about scanned items
- **useScanner.ts**: Composable for scanner functionality
- **useDialog.ts**: Composable for dialog management
- **DialogComponent.vue**: Base component for dialogs
- **CardSectionTitle.vue**: Component for section titles in cards

### Dependencies

- Vue.js 3
- Quasar Framework
- Vue Router
- Vue I18n
- vue-qrcode-reader

### Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

### License

This project is licensed under the MIT License.
