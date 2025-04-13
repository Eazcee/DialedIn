const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }, // Full timestamp
  minutes: { type: Number, required: true },
});

module.exports = mongoose.model('TimeEntry', TimeEntrySchema); 