import { JanusClient } from '@vtex/api'
import type { IOContext, InstanceOptions } from '@vtex/api'

export class Catalog extends JanusClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: {
        VtexIdclientAutCookie: `${
          ctx.adminUserAuthToken ?? ctx.storeUserAuthToken ?? ctx.authToken
        }`,
      },
    })
  }

  public async getProductById(productId: string) {
    return this.http.get(
      `/api/catalog_system/pub/products/search/?fq=productId:${productId}`,
      {
        metric: 'catalog-getProductById',
      }
    )
  }

  public async getProductByCategory(categoryTree: string) {
    return this.http.get(
      `/api/catalog_system/pub/products/search/?fq=C:${categoryTree}`,
      {
        metric: 'catalog-getProductByCategory',
      }
    )
  }

  public async getSkuById(skuId: string) {
    return this.http.get(`/api/catalog/pvt/stockkeepingunit/${skuId}`, {
      metric: 'catalog-getSkuById',
    })
  }

  public async getAllSkuList(page = 1, pageSize = 10) {
    return this.http.get(
      `/api/catalog_system/pvt/sku/stockkeepingunitids/?page=${page}&pageSize=${pageSize}`,
      {
        metric: 'catalog-getAllSkuList',
      }
    )
  }

  public async getBrandList() {
    return this.http.get(`/api/catalog_system/pvt/brand/list`, {
      metric: 'catalog-getBrandList',
    })
  }

  public async getCategories(level: number) {
    return this.http.get(`/api/catalog_system/pub/category/tree/${level}`, {
      metric: 'catalog-getCategories',
    })
  }

  public async getSpecificationsTree(categoryId: number) {
    return this.http.get(
      `/api/catalog_system/pub/specification/field/listTreeByCategoryId/${categoryId}`,
      {
        metric: 'catalog-getSpecificationsTree',
      }
    )
  }

  public async getSkusByProductId(productId: string) {
    return this.http.get(
      `/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productId}`,
      {
        metric: 'catalog-getSkusByProductId',
      }
    )
  }

  public async getSkuAndContext(skuId: string) {
    return this.http.get(
      `/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`,
      {
        metric: 'catalog-getSkuByIdVtex',
      }
    )
  }

  public async getCategoriesTree() {
    return this.http.get(`/api/catalog_system/pub/category/tree/1`, {
      metric: 'catalog-getCategoriesTree',
    })
  }

  public async getCategoryById(categoryId: string) {
    return this.http.get(`/api/catalog_system/pub/category/${categoryId}`, {
      metric: 'catalog-getCategoryById',
    })
  }
}
