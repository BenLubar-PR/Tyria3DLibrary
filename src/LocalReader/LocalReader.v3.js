/*
Copyright © Tyria3DLibrary project contributors

This file is part of the Tyria 3D Library.

Tyria 3D Library is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Tyria 3D Library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with the Tyria 3D Library. If not, see <http://www.gnu.org/licenses/>.
*/

const ArchiveParser = require("./ArchiveParser");
const DataWorkers = require("./DataWorkers.exp");

/**
 * The order of items follows where they are in the archive, which means the table index is real
 * @typedef MetaData
 * @property {number}   mftId
 * @property {number}   offset
 * @property {number}   size
 * @property {boolean}  compressed
 * @property {number}   crc
 * @property {string}   type
 */

/**
 * @typedef MetaDataStore
 * @property {Array<MetaData>} table
 */

/**
 * @param {Array<MetaData>} old
 * @param {Array<{}>}
 */
function loadCache(old, current) {
  // compare crcs and size for each entry and remove the entry from the cache if it doesn't match
  for (const entry of current) {
    if (entry.mftId != undefined)
      const matchingOld = old.find(e => e.mftId === entry.mftId);
    if (matchinOld && entry.crc === matchingOld.crc && entry.size === matchingOld.size) {
      entry.type = matchingOld.type;
    }
  }
}

/**
 *
 * @param {Array<number>} mftTable
 * @param {Array<{offset: number, size: number, compressed: boolean, crc: number }>} entryTable
 */
function attachMftTable(mftTable, entryTable) {
  for (const [index, entry] of entryTable.entries()) {
    entry.mftId = mftTable[index];
  }
}

/**
 * LocalRader contructor
 * 
 * This localreader also has a queue like the dataworkers but it doesnt contain buffer data so is very light
 * It only fetches the data from the archive at a simultaneous rate than what the decoder is able to do
 * But should never keep him waiting
 * @param {File} file
 * @param {Object} options
 * @param {MetaDataStore} options.metaDataCache
 */
const LocalReader = function (file, { metaDataCache, workersAmount, workersPaths } = {}) {
  const dataWorkers = DataWorkers({ workersAmount, workersPath });

  let { metaTable, indexTable } = await ArchiveParser.readArchive(file);
  attachMftTable(indexTable, metaTable);
  if (metaDataCache && metaDataCache.table) {
    loadCache(metaDataCache.table, metaTable);
  }

  // {fileIndex, uncompress, decodeImage, callback}
  const maxWorkersTasks = workersAmount * 3;
  let workQueue = [];
  let workersTaskAmount = 0;

  /**
   * Replaces all the functions to get the decompressed file, decoded image or raw one.
   * But works natively in batch mode allowing to efficiently query multiple at once.
   *
   * @param {Array<{fileId: number, uncompress: boolean, decodeImage: boolean, callback: function}>} workArray
   * @param {function} callback End callback
   */
  function getFiles(workArray) {
    workQueue = workQueue.concat(workArray.map(work => ({
      work,
      type: "getFile"
    })));
    // distributeWork();
  }

  /**
   * Replaces all the functions to get file types, maps, offsets, size, compression...
   * Some fields are hidden by default since they should never be used. (offset, mftIndex)
   * The "type" field is not enabled by default, if the the type is not in the cache it will be undefined
   * The "scanForType" option can be used to tell the LocalReader to read the file head to get its type
   * if it can't get it from the cache. But if it already knows it, it returns it from the cache.
   *
   * @param {Array<{fileId: number, scan: boolean, fields: Array, callback: function}>} workArray
   * @param {function} callback End callback
   */
  function getFilesMetaData(
    workArray,
    callback
  ) { }

  /**
   * makeCache returns a snapshot of the metadata store,
   * it should be used with persistant storage to allow fast archive opening times.
   *
   * @returns {MetaDataStore}
   */
  function makeCache() { }

  return {
    getFiles,
    getFilesMetaData,
    getCache
  };
};

module.exports = LocalReader;
