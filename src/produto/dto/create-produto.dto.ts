export class CreateProdutoDto {
  nome: string;
  descricao?: string | null;
  precoCompra?: number | null;
  precoVenda?: number | null;
  quantidade?: number | null;
  status?: boolean;
}
