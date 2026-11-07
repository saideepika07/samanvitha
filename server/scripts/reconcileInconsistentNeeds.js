// Reconcile Inconsistent Needs Script
// -----------------------------------------------------------------------------
// Scans for Need records where (usableStock + reservedQuantity > requiredQuantity).
//
// SAFETY GUARDS:
// 1. Defaults to DRY RUN: lists over-allocated needs without modifying database data.
// 2. Requires explicit --confirm flag to apply corrective adjustments.
//
// Usage:
//   node server/scripts/reconcileInconsistentNeeds.js            (Dry run: lists inconsistent needs)
//   node server/scripts/reconcileInconsistentNeeds.js --confirm  (Applies reconciliation)
// -----------------------------------------------------------------------------

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const Need = require('../src/models/Need.js');

/**
 * Scans the database for needs where usableStock + reservedQuantity > requiredQuantity.
 * @returns {Promise<Array>} List of over-allocated need documents
 */
async function scanInconsistentNeeds() {
  return Need.find({
    $expr: {
      $gt: [
        { $add: [{ $ifNull: ['$usableStock', 0] }, { $ifNull: ['$reservedQuantity', 0] }] },
        '$requiredQuantity',
      ],
    },
  }).sort({ createdAt: -1 });
}

/**
 * Reconciles inconsistent needs.
 * If confirm is false, acts as a dry run.
 * If confirm is true, adjusts reservedQuantity so usableStock + reservedQuantity <= requiredQuantity.
 *
 * @param {Object} options
 * @param {boolean} [options.confirm=false] - Whether to apply updates
 * @returns {Promise<{ found: number, reconciled: number, records: Array }>}
 */
async function reconcileInconsistentNeeds({ confirm = false } = {}) {
  const inconsistentRecords = await scanInconsistentNeeds();
  const summary = [];

  for (const need of inconsistentRecords) {
    const required = need.requiredQuantity || 0;
    const stock = need.usableStock || 0;
    const reserved = need.reservedQuantity || 0;
    const totalAllocated = stock + reserved;
    const excess = totalAllocated - required;

    // Corrective calculation: clamp reserved quantity to maximum remaining allowable deficit
    const correctedReserved = Math.max(0, required - stock);
    const correctedStatus =
      stock + correctedReserved >= required ? 'Fulfilled' : need.status;

    const recordSummary = {
      id: need._id.toString(),
      itemType: need.itemType,
      category: need.category,
      institutionName: need.institutionName,
      requiredQuantity: required,
      usableStock: stock,
      originalReservedQuantity: reserved,
      excessUnits: excess,
      targetReservedQuantity: correctedReserved,
      targetStatus: correctedStatus,
    };

    if (confirm) {
      await Need.findByIdAndUpdate(need._id, {
        $set: {
          reservedQuantity: correctedReserved,
          status: correctedStatus,
        },
      });
      recordSummary.applied = true;
    } else {
      recordSummary.applied = false;
    }

    summary.push(recordSummary);
  }

  return {
    found: inconsistentRecords.length,
    reconciled: confirm ? summary.length : 0,
    records: summary,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not set in environment or server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('\n================================================================================');
    console.log(`SCANNING FOR INCONSISTENT / OVER-ALLOCATED NEEDS`);
    console.log(`Mode: ${confirm ? 'CONFIRM (Changes will be applied)' : 'DRY RUN (Read-only, no data will be changed)'}`);
    console.log('================================================================================\n');

    const result = await reconcileInconsistentNeeds({ confirm });

    if (result.found === 0) {
      console.log('✓ No inconsistent need records found.');
      console.log('All needs satisfy: usableStock + reservedQuantity <= requiredQuantity.\n');
    } else {
      console.log(`Found ${result.found} inconsistent need record(s):\n`);
      result.records.forEach((r, idx) => {
        console.log(`[${idx + 1}] Need ID: ${r.id}`);
        console.log(`    Item: "${r.itemType}" (${r.category})`);
        console.log(`    Institution: ${r.institutionName}`);
        console.log(`    Required: ${r.requiredQuantity} | Usable Stock: ${r.usableStock} | Reserved: ${r.originalReservedQuantity}`);
        console.log(`    Total Allocated: ${r.usableStock + r.originalReservedQuantity} (EXCESS: +${r.excessUnits} units)`);
        if (confirm) {
          console.log(`    -> RECONCILED: reservedQuantity updated to ${r.targetReservedQuantity}, status: ${r.targetStatus}`);
        } else {
          console.log(`    -> Target fix if confirmed: reservedQuantity = ${r.targetReservedQuantity}, status: ${r.targetStatus}`);
        }
        console.log('');
      });

      if (!confirm) {
        console.log('--------------------------------------------------------------------------------');
        console.log('DRY RUN COMPLETE: No data was modified.');
        console.log('To apply the reconciliation fixes shown above, run with --confirm:');
        console.log('  node server/scripts/reconcileInconsistentNeeds.js --confirm');
        console.log('--------------------------------------------------------------------------------\n');
      } else {
        console.log(`✓ Reconciled ${result.reconciled} need record(s) successfully.\n`);
      }
    }
  } catch (err) {
    console.error('Reconciliation error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  scanInconsistentNeeds,
  reconcileInconsistentNeeds,
};
