import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompraProdutoDto } from './dto/compra-produto.dto';
import { VendaProdutoDto } from './dto/venda-produto.dto';
import { Operacao, Produto } from '@prisma/client';
import { NOMEM } from 'dns';
import { privateDecrypt } from 'crypto';

@Injectable()
export class ProdutoService {
  constructor(private prisma: PrismaService) {}

  async buscarTodos(): Promise<Produto[]> {
    //método que retorna todos os produtos com status ativo (true)
    const produtos = await this.prisma.produto.findMany({
      where: { status: true },
    });
    if (!produtos)
      throw new InternalServerErrorException(
        'Não foi possível buscar os produtos.',
      );
    return produtos;
  }

  async criar(createProdutoDto: CreateProdutoDto): Promise<Produto> {
    //desenvolver método que cria um novo produto, retornando o produto criado
    const data = { ...createProdutoDto };

    const produto = await this.prisma.produto.create({
      data,
    });
    // throw new Error('Método não implementado.');

    return produto;
  }

  async buscarPorId(id: number): Promise<Produto> {
    //desenvolver método para retornar o produto do id informado, com os respectivos dados de operações
    //throw new Error('Método não implementado.');

    const produto = await this.prisma.produto.findFirst({ where: { id } });
    const operacoes = await this.prisma.operacao.findMany({
      where: { produtoId: id },
    });

    const response = { ...produto, operacoes };
    return response;
  }

  async atualizar(
    id: number,
    updateProdutoDto: UpdateProdutoDto,
  ): Promise<Produto> {
    //desenvolver método para atualizar os dados do produto do id informado, retornando o produto atualizado
    //throw new Error('Método não implementado.');

    const produto: CreateProdutoDto = await this.prisma.produto.findFirst({
      where: { id },
    });
    const data = {
      precoCompra: updateProdutoDto.precoCompra || produto.precoCompra,
      precoVenda: updateProdutoDto.precoVenda || produto.precoVenda,
      quantidade: updateProdutoDto.quantidade || produto.quantidade,
    };

    const newProduto = await this.prisma.produto.update({
      where: { id },
      data,
    });

    return newProduto;
  }

  async desativar(id: number): Promise<Produto> {
    //dsenvolver método para desativar o produto, mudar o status parea false
    //throw new Error('Método não implementado.');
    const produto = await this.prisma.produto.findFirst({
      where: { id },
    });

    const data: CreateProdutoDto = {
      nome: produto.nome,
      descricao: produto.descricao,
      precoCompra: produto.precoCompra,
      precoVenda: produto.precoVenda,
      quantidade: produto.quantidade,
      status: false,
    };

    const produtoDesativado = await this.prisma.produto.update({
      where: { id },
      data,
    });
    return produtoDesativado;
  }

  async comprarProdutos(
    id: number,
    compraProdutoDto: CompraProdutoDto,
  ): Promise<Operacao> {
    const tipo = 1;
    //desenvolver método que executa a operação de compra, retornando a operação com os respectivos dados do produto
    //tipo: 1 - compra, 2 - venda
    //o preço de venda do produto deve ser calculado a partir do preço inserido na operacao, com uma margem de 50% de lucro
    //caso o novo preço seja maior que o preço de venda atual, o preço de venda deve ser atualizado, assim como o preço de compra
    //calcular o valor total gasto na compra (quantidade * preco)
    //deve também atualizar a quantidade do produto, somando a quantidade comprada
    //throw new Error('Método não implementado.');

    const produto = await this.prisma.produto.findFirst({ where: { id } });

    const precoVenda = compraProdutoDto.preco * 1.5;

    const total = compraProdutoDto.quantidade * compraProdutoDto.preco;

    const data: CreateProdutoDto = {
      nome: produto.nome,
      descricao: produto.descricao,
      status: produto.status,
      precoVenda:
        precoVenda > produto.precoVenda ? precoVenda : produto.precoVenda,
      precoCompra:
        precoVenda > produto.precoVenda
          ? compraProdutoDto.preco
          : produto.precoCompra,
      quantidade: produto.quantidade + compraProdutoDto.quantidade,
    };

    const compra = await this.prisma.operacao.create({
      data: {
        quantidade: compraProdutoDto.quantidade,
        preco: compraProdutoDto.preco,
        total,
        tipo,
        produtoId: produto.id,
      },
    });

    const novoProduto = await this.prisma.produto.update({
      where: { id },
      data,
    });

    const response = { ...compra, novoProduto };
    return response;
  }

  async venderProdutos(
    id: number,
    vendaProduto: VendaProdutoDto,
  ): Promise<Operacao> {
    const tipo = 2;
    //desenvolver método que executa a operação de venda, retornando a venda com os respectivos dados do produto
    //tipo: 1 - compra, 2 - venda
    //calcular o valor total recebido na venda (quantidade * preco)
    //deve também atualizar a quantidade do produto, subtraindo a quantidade vendida
    //caso a quantidade seja esgotada, ou seja, chegue a 0, você deverá atualizar os precoVenda e precoCompra para 0
    //throw new Error('Método não implementado.');

    const produtoVendido = await this.prisma.produto.findFirst({
      where: { id },
    });

    const total = vendaProduto.quantidade * produtoVendido.precoVenda;

    const novaQuantidade = produtoVendido.quantidade - vendaProduto.quantidade;

    const produtoEsgotado =
      produtoVendido.quantidade - vendaProduto.quantidade === 0 ? 0 : null;

    const produtoAtualizado = {
      nome: produtoVendido.nome,
      descricao: produtoVendido.descricao,
      precoCompra: produtoEsgotado || produtoVendido.precoCompra,
      precoVenda: produtoEsgotado || produtoVendido.precoVenda,
      quantidade: novaQuantidade,
      status: produtoVendido.status,
    };

    const venda = await this.prisma.operacao.create({
      data: {
        quantidade: vendaProduto.quantidade,
        preco: produtoVendido.precoVenda,
        total,
        tipo,
        produtoId: produtoVendido.id,
      },
    });

    const novoProduto = await this.prisma.produto.update({
      where: { id },
      data: { ...produtoAtualizado },
    });

    const response = { ...venda, novoProduto };

    return response;
  }
}
