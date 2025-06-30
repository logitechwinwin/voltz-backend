import { Injectable } from "@nestjs/common";
import { createObjectCsvWriter } from "csv-writer";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class CsvService {
  async generateCsvFile(headers: { id: string; title: string }[], data: any[], fileName: string): Promise<string> {
    const reportsDir = path.join("public", "reports");
    const filePath = path.join(reportsDir, `${fileName}-${Date.now()}.csv`);

    // Ensure the directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true }); // Create the directory recursively
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    await csvWriter.writeRecords(data);
    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    fs.unlink(filePath, err => {
      if (err) {
        console.error("Error deleting the file:", err);
      } else {
        console.log(`File ${filePath} was deleted.`);
      }
    });
  }
}
