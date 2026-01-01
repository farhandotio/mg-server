import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  phone: String,
  street: String,
  city: String,
  state: String,
  zip: String,
  country: String,
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    addresses: [addressSchema],
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

const userModel = mongoose.model('User', userSchema);
export default userModel;
