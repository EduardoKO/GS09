import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Cliente não encontrado');
    }

    const productsIds = products.map(product => {
      return { id: product.id };
    });

    const productsData = await this.productsRepository.findAllById(productsIds);

    const orderProducts = productsData.map(productData => {
      const orderProduct = products.find(
        product => product.id === productData.id,
      );

      if (!orderProduct) {
        throw new AppError('Um ou mais produtos não encontrado.');
      }

      if (orderProduct.quantity > productData.quantity) {
        throw new AppError('Quantidade insuficiente.');
      }

      return {
        product_id: orderProduct.id,
        price: productData.price,
        quantity: orderProduct.quantity,
      };
    });

    if (!orderProducts || orderProducts.length <= 0) {
      throw new AppError('Produto(s) não encontrado(s).');
    }

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
