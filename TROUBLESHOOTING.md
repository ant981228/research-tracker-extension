# Troubleshooting Guide

This document covers common issues you might encounter when using the Research Tracker extension and how to resolve them.

## Installation Issues

### Extension Not Loading

If the extension doesn't load after installation:

1. Verify that you've enabled Developer mode in `chrome://extensions/`
2. Check for any error messages in the extension details page
3. Try reloading the extension by clicking the refresh icon
4. Restart Chrome and try loading the extension again

### Missing Icons

If the extension icons don't appear:

1. Check that the icons are present in the `images` directory
2. Verify that the manifest.json file has the correct paths to the icons
3. Try reloading the extension

## Recording Issues

### Not Recording Searches

If the extension isn't recording your searches:

1. Make sure recording is active (click the extension icon to verify)
2. Check if you're using a supported search engine (Google, Bing, Google Scholar, DuckDuckGo, Google News)
3. If a search engine's layout has changed, the extension may need updating to match the new selectors

### Session Data Missing

If your session data seems incomplete:

1. Make sure you started recording before beginning your research
2. Check if you accidentally paused recording
3. Verify that you're using supported search engines
4. Check if any browser privacy extensions might be blocking content scripts

## Export Issues

### Can't Export Session Data

If you're having trouble exporting your session data:

1. Make sure you've completed at least one research session
2. Try both export formats (JSON and TXT)
3. Check your browser's download settings
4. Try exporting a smaller session if you have a very large one

### Export Contains Incorrect Data

If the exported data seems incorrect:

1. Check if multiple recording sessions were accidentally merged
2. Verify that recording was properly started and stopped
3. Look for any error messages in the browser console (press F12 to open)

## Permission Issues

If you see permission-related errors:

1. Make sure you approved all permissions during installation
2. The extension requires access to tabs, storage, and webNavigation
3. If you denied permissions, you may need to reinstall the extension

## Browser Compatibility

This extension is designed for Chrome. If you're using another Chromium-based browser:

1. Most features should work in Edge, Brave, and other Chromium browsers
2. Some browser-specific features might not work as expected
3. Report any browser-specific issues for future updates

## Reporting Issues

If you encounter a bug or have a feature request:

1. Check if the issue is covered in this troubleshooting guide
2. Look for any error messages in the browser console (F12 > Console)
3. Provide details about:
   - Your browser and version
   - Steps to reproduce the issue
   - What you expected to happen
   - What actually happened
   - Any error messages you saw