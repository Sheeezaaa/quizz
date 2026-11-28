import mongoose from 'mongoose';

// MongoDB Schema Definitions for Battle of Brains 2026

const ParticipantSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String },
  department: { type: String, default: 'Software Engineering' },
  degreeProgram: { type: String, default: 'BS Software Engineering' },
  semester: { type: String, default: '4th Semester' },
  universityName: { type: String, default: 'COMSATS University Islamabad' },
  campus: { type: String, default: 'Islamabad Campus' },
  region: { type: String, default: 'Federal Capital' },
  passwordHash: { type: String },
  registrationStatus: { type: String, default: 'Approved' },
  status: { type: String, default: 'Verified' },
  role: { type: String, default: 'Participant' },
  rulesAccepted: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  lastLoginAt: { type: String },
  lastActiveAt: { type: String },
  registeredAt: { type: String },
  teamId: { type: String },
  teamMembers: { type: Array, default: [] },
}, { timestamps: true });

const LiveLoginEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, default: 'Computer Science' },
  campus: { type: String, default: 'Main Campus' },
  semester: { type: String, default: '4th Semester' },
  loginTime: { type: String, required: true },
  seenByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

const ProctorAlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, required: true },
  department: { type: String },
  timestamp: { type: String, required: true },
  reason: { type: String, required: true },
  violationCount: { type: Number, default: 1 },
  acknowledged: { type: Boolean, default: false },
}, { timestamps: true });

const QuizAttemptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, index: true },
  roundNumber: { type: Number, default: 1 },
  startedAt: { type: String },
  expiresAt: { type: String },
  finishedAt: { type: String },
  status: { type: String, default: 'in_progress' },
  totalScore: { type: Number, default: 0 },
  answers: { type: Array, default: [] },
  isDisqualified: { type: Boolean, default: false },
}, { timestamps: true });

const AppDataBackupSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now },
});

export const ParticipantModel = mongoose.models.Participant || mongoose.model('Participant', ParticipantSchema);
export const LiveLoginEventModel = mongoose.models.LiveLoginEvent || mongoose.model('LiveLoginEvent', LiveLoginEventSchema);
export const ProctorAlertModel = mongoose.models.ProctorAlert || mongoose.model('ProctorAlert', ProctorAlertSchema);
export const QuizAttemptModel = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema);
export const AppDataBackupModel = mongoose.models.AppDataBackup || mongoose.model('AppDataBackup', AppDataBackupSchema);

let isConnected = false;

export async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = conn.connection.readyState === 1;
    console.log('✅ Connected to MongoDB Atlas Cloud Database successfully!');
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Falling back to local/cached JSON database:', err.message);
    isConnected = false;
    return false;
  }
}

export function isMongoDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

// Sync in-memory DB snapshot to MongoDB in background
export async function syncDbToMongoDB(db) {
  if (!isMongoDBConnected()) return;
  try {
    // 1. Sync App Snapshot
    await AppDataBackupModel.findOneAndUpdate(
      { key: 'current_database_snapshot' },
      { data: db, updatedAt: new Date() },
      { upsert: true }
    );

    // 2. Sync Participants
    if (Array.isArray(db.participants)) {
      const ops = db.participants.map(p => ({
        updateOne: {
          filter: { studentId: p.studentId },
          update: { $set: p },
          upsert: true
        }
      }));
      if (ops.length > 0) {
        await ParticipantModel.bulkWrite(ops, { ordered: false }).catch(() => {});
      }
    }

    // 3. Sync Live Login Events
    if (Array.isArray(db.liveLoginEvents)) {
      const ops = db.liveLoginEvents.map(e => ({
        updateOne: {
          filter: { id: e.id },
          update: { $set: e },
          upsert: true
        }
      }));
      if (ops.length > 0) {
        await LiveLoginEventModel.bulkWrite(ops, { ordered: false }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Background MongoDB sync error:', err.message);
  }
}

// Populate in-memory DB from MongoDB on startup or cold-start
export async function loadDbFromMongoDB() {
  if (!isMongoDBConnected()) return null;
  try {
    const backup = await AppDataBackupModel.findOne({ key: 'current_database_snapshot' }).lean();
    if (backup && backup.data) {
      return backup.data;
    }
  } catch (err) {
    console.warn('Failed to load DB snapshot from MongoDB:', err.message);
  }
  return null;
}
