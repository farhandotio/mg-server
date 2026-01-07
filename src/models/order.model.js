import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        title: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        image: { type: String, required: true },
      },
    ],

    shippingAddress: {
      fullname: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, required: true },
    },

    payment: {
      method: {
        type: String,
        enum: ['COD', 'ONLINE'],
        required: true,
      },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
        default: 'PENDING',
      },
      provider: {
        type: String,
        enum: ['SSLCOMMERZ', 'BKASH', 'NAGAD', 'NONE'],
        default: 'NONE',
      },
      providerPaymentId: {
        type: String,
        default: null,
      },
      transactionId: {
        type: String,
        unique: true,
        sparse: true,
      },
      paidAt: {
        type: Date,
      },
    },

    pricing: {
      itemsPrice: { type: Number, required: true },
      shippingPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },

    orderStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
    },

    deliveredAt: Date,
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
