export async function products(ctx: Context, next: () => Promise<any>) {
  const { clients } = ctx

  const { productId } = ctx.query

  if (!productId) {
    ctx.status = 400
    ctx.body = {
      error: 'ProductId is required',
    }

    return
  }

  try {
    const product = await clients.catalog.getProductById(productId as string)

    if (!product) {
      ctx.status = 404
      ctx.body = {
        error: 'Product not found',
      }

      return
    }

    const skus = await clients.catalog.getSkusByProductId(productId as string)

    const orderForm = {
      items: skus.map((sku: any) => ({
        id: sku.Id,
        quantity: 1,
        seller: '1',
      })),
    }

    const simulation = await clients.checkout.orderSimulation(orderForm)

    ctx.status = 200
    ctx.body = {
      product,
      skus,
      simulation,
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: error.message,
    }
  }

  await next()
}

export async function productsByCategory(
  ctx: Context,
  next: () => Promise<any>
) {
  const { clients } = ctx

  const { categoryTree } = ctx.query

  if (!categoryTree) {
    ctx.status = 400
    ctx.body = {
      error: 'CategoryTree is required',
    }

    return
  }

  try {
    const productList = await clients.catalog.getProductByCategory(
      categoryTree as string
    )

    if (!productList) {
      ctx.status = 404
      ctx.body = {
        error: 'Products not found',
      }

      return
    }

    ctx.status = 200
    ctx.body = productList
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: error.message,
    }
  }

  await next()
}
