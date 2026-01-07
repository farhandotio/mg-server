import productModel from '../models/product.model.js';

const updateStockAfterPayment = async (order) => {
  const updates = order.orderItems.map((item) =>
    productModel.findByIdAndUpdate(item.product, {
      $inc: {
        stock: -item.quantity,
        sold: item.quantity,
      },
    })
  );

  await Promise.all(updates);
};

export default updateStockAfterPayment;
