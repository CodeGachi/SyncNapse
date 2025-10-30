/**
 * IndexedDB Test Page
 * Navigate to /test-db to run tests in browser
 */

"use client";

import { useState } from "react";
import { createFolder, getAllFolders } from "@/lib/db/folders";
import { createNote, getAllNotes } from "@/lib/db/notes";
import { initDB } from "@/lib/db";

export default function TestDBPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${isError ? "❌ ERROR:" : "✓"} ${message}`;
    setLogs((prev) => [...prev, formattedMessage]);
    // eslint-disable-next-line no-console
    console.log(formattedMessage);
  };

  const runTests = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      addLog("Starting IndexedDB tests...");

      // Test 1: Initialize DB
      addLog("Test 1: Initializing IndexedDB...");
      try {
        const db = await initDB();
        addLog(`IndexedDB initialized successfully: ${db.name} v${db.version}`);
      } catch (error) {
        addLog(`Failed to initialize IndexedDB: ${error}`, true);
        return;
      }

      // Test 2: Create root folder
      addLog("Test 2: Creating root folder...");
      try {
        const folder1 = await createFolder("Test Folder 1", null);
        addLog(`Created folder: ${folder1.name} (ID: ${folder1.id})`);
      } catch (error) {
        addLog(`Failed to create folder: ${error}`, true);
      }

      // Test 3: Create subfolder
      addLog("Test 3: Creating subfolder...");
      try {
        const allFolders = await getAllFolders();
        const parentFolder = allFolders[0];
        if (parentFolder) {
          const subfolder = await createFolder(
            "Test Subfolder",
            parentFolder.id
          );
          addLog(
            `Created subfolder: ${subfolder.name} under ${parentFolder.name}`
          );
        } else {
          addLog("No parent folder found for subfolder test", true);
        }
      } catch (error) {
        addLog(`Failed to create subfolder: ${error}`, true);
      }

      // Test 4: Get all folders
      addLog("Test 4: Retrieving all folders...");
      try {
        const folders = await getAllFolders();
        addLog(`Retrieved ${folders.length} folders`);
        folders.forEach((f) => {
          addLog(`  - ${f.name} (parent: ${f.parentId || "root"})`);
        });
      } catch (error) {
        addLog(`Failed to retrieve folders: ${error}`, true);
      }

      // Test 5: Create note
      addLog("Test 5: Creating note...");
      try {
        const note = await createNote("Test Note", "root");
        addLog(`Created note: ${note.title} (ID: ${note.id})`);
      } catch (error) {
        addLog(`Failed to create note: ${error}`, true);
      }

      // Test 6: Create note in folder
      addLog("Test 6: Creating note in folder...");
      try {
        const folders = await getAllFolders();
        if (folders.length > 0) {
          const note = await createNote("Test Note in Folder", folders[0].id);
          addLog(
            `Created note in folder: ${note.title} in folder ${folders[0].name}`
          );
        } else {
          addLog("No folder available for note creation test", true);
        }
      } catch (error) {
        addLog(`Failed to create note in folder: ${error}`, true);
      }

      // Test 7: Get all notes
      addLog("Test 7: Retrieving all notes...");
      try {
        const notes = await getAllNotes();
        addLog(`Retrieved ${notes.length} notes`);
        notes.forEach((n) => {
          addLog(`  - ${n.title} (folder: ${n.folderId})`);
        });
      } catch (error) {
        addLog(`Failed to retrieve notes: ${error}`, true);
      }

      addLog("All tests completed!");
    } catch (error) {
      addLog(`Unexpected error: ${error}`, true);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#191919] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">
          IndexedDB Test Page
        </h1>
        <p className="text-gray-400 mb-6">
          This page tests IndexedDB operations for folders and notes.
        </p>

        <div className="flex gap-4 mb-6">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-6 py-3 bg-[#6B7B3E] text-white rounded-lg hover:bg-[#7A8A4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? "Running Tests..." : "Run Tests"}
          </button>
          <button
            onClick={clearLogs}
            className="px-6 py-3 bg-[#575757] text-white rounded-lg hover:bg-[#6B6B6B] transition-colors"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-[#2F2F2F] rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
          <div className="bg-[#191919] rounded-lg p-4 font-mono text-sm max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No tests run yet.</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes("ERROR") ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
          <h3 className="font-bold text-blue-300 mb-2">Instructions:</h3>
          <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
            <li>Open your browser&apos;s Developer Console (F12)</li>
            <li>Click &quot;Run Tests&quot; button above</li>
            <li>Check both the logs here and the console for errors</li>
            <li>
              If tests fail, check the console for detailed error messages
            </li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
          <h3 className="font-bold text-yellow-300 mb-2">Environment Info:</h3>
          <div className="text-yellow-200 text-sm space-y-1">
            <div>
              IndexedDB Support:{" "}
              {typeof window !== "undefined" && "indexedDB" in window
                ? "✓ Supported"
                : "✗ Not Supported"}
            </div>
            <div>
              NEXT_PUBLIC_USE_LOCAL_DB:{" "}
              {process.env.NEXT_PUBLIC_USE_LOCAL_DB || "not set"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
