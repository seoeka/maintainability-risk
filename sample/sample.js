import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dayjs from 'dayjs';
import lodash from 'lodash';
import chalk from 'chalk';

function calculateDiscount(price, type) {
  if (type === 'student') {
    return price * 0.9;
  }
  return price;
}

function processOrder(order, user, inventory, paymentGateway, notifier) {
  let total = 0;

  if (!order) {
    return null;
  }

  for (const item of order.items) {
    if (inventory[item.id]) {
      if (inventory[item.id].stock > item.quantity) {
        total += item.price * item.quantity;
      } else if (inventory[item.id].stock === item.quantity) {
        total += item.price * item.quantity;
        inventory[item.id].stock = 0;
      } else {
        notifier.warn('Stock tidak cukup');
      }
    } else {
      notifier.warn('Item tidak ditemukan');
    }
  }

  if (user && user.member) {
    if (user.level === 'gold') {
      total = total * 0.8;
    } else if (user.level === 'silver') {
      total = total * 0.9;
    } else if (user.level === 'bronze') {
      total = total * 0.95;
    }
  }

  if (order.coupon) {
    if (order.coupon.type === 'percent') {
      total = total - total * order.coupon.value;
    } else if (order.coupon.type === 'nominal') {
      total = total - order.coupon.value;
    }
  }

  if (total > 0 && paymentGateway.isAvailable()) {
    const paid = paymentGateway.pay(user.id, total);
    if (paid) {
      notifier.success('Pembayaran berhasil');
      return { status: 'paid', total };
    }
    notifier.error('Pembayaran gagal');
    return { status: 'failed', total };
  }

  return { status: 'invalid', total };
}

const mapUser = (user) => {
  return {
    id: user.id,
    name: user.name
  };
};
