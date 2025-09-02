import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Product, CreateProductRequest, UpdateProductRequest } from '@/lib/types/api';

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
};

// Hooks
export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: () => apiClient.getProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductRequest) => apiClient.createProduct(data),
    onSuccess: (newProduct) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      
      // Add the new product to the cache
      queryClient.setQueryData(productKeys.detail(newProduct.id), newProduct);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) =>
      apiClient.updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      // Update the specific product in cache
      queryClient.setQueryData(productKeys.detail(updatedProduct.id), updatedProduct);
      
      // Update the product in the list cache
      queryClient.setQueryData(productKeys.lists(), (oldData: Product[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product
        );
      });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      // Remove from products list
      queryClient.setQueryData(productKeys.lists(), (oldData: Product[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter((product) => product.id !== deletedId);
      });
      
      // Remove the specific product from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(deletedId) });
    },
  });
};