/**
 * SheetsManager - Provides utility functions for creating and managing Google Sheets
 *
 * This module complements the GoogleSheetsORM by providing functions to:
 * - Create new spreadsheets
 * - Share spreadsheets with users
 * - Manage permissions programmatically
 */
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

/**
 * SheetsManager class for creating and managing Google Sheets
 */
class SheetsManager {
  /**
   * @param {Object} config - Configuration options
   * @param {Object} config.credentials - Service account credentials JSON
   */
  constructor(config) {
    if (!config.credentials) {
      throw new Error('Service account credentials are required');
    }

    this.credentials = config.credentials;
    this.auth = null;
    this.drive = null;
    this.sheets = null;
  }

  /**
   * Initialize the connection to Google APIs
   * @returns {SheetsManager} The initialized instance
   */
  async initialize() {
    try {
      // Create an auth client
      this.auth = new GoogleAuth({
        credentials: this.credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      // Initialize API clients
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      return this;
    } catch (error) {
      throw new Error(`Failed to initialize SheetsManager: ${error.message}`);
    }
  }

  /**
   * Create a new Google Sheet
   * @param {string} fileName - Name of the file to create
   * @param {Array<string>} [sheetNames=['Sheet1']] - Names of the worksheet tabs
   * @param {string} [shareWithEmail] - Email address to share the sheet with
   * @returns {Object} Object containing file ID and URL
   */
  async createSheet(fileName, sheetNames = ['Sheet1'], shareWithEmail = null) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      // Create a new spreadsheet
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: fileName
          },
          sheets: sheetNames.map(name => ({
            properties: {
              title: name
            }
          }))
        }
      });

      const spreadsheetId = response.data.spreadsheetId;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // Share the spreadsheet if an email was provided
      if (shareWithEmail) {
        for (const toemail of shareWithEmail) {
          await this.shareSheet(spreadsheetId, toemail);
        }
      }

      return {
        id: spreadsheetId,
        url: spreadsheetUrl
      };
    } catch (error) {
      throw new Error(`Failed to create spreadsheet: ${error.message}`);
    }
  }

  /**
   * Share a spreadsheet with a specific user
   * @param {string} spreadsheetId - ID of the spreadsheet to share
   * @param {string} email - Email address to share with
   * @param {string} [role='writer'] - Role to assign (reader, writer, or owner)
   * @returns {Object} Result of the permission creation
   */
  async shareSheet(spreadsheetId, email, role = 'writer') {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      const response = await this.drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: 'user',
          role: role,
          emailAddress: email
        }
      });

      return {
        success: true,
        permissionId: response.data.id
      };
    } catch (error) {
      throw new Error(`Failed to share spreadsheet: ${error.message}`);
    }
  }

  /**
   * List sheets in a spreadsheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @returns {Array} List of sheet objects
   */
  async listSheets(spreadsheetId) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });

      return response.data.sheets.map(sheet => ({
        id: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index
      }));
    } catch (error) {
      throw new Error(`Failed to list sheets: ${error.message}`);
    }
  }

  /**
   * Add a new sheet to an existing spreadsheet
   * @param {string} spreadsheetId - ID of the spreadsheet
   * @param {string} sheetName - Name for the new sheet
   * @returns {Object} The created sheet
   */
  async addSheet(spreadsheetId, sheetName) {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        }
      });

      return {
        id: response.data.replies[0].addSheet.properties.sheetId,
        title: response.data.replies[0].addSheet.properties.title
      };
    } catch (error) {
      throw new Error(`Failed to add sheet: ${error.message}`);
    }
  }
}

module.exports = SheetsManager;
