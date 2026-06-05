import { Request, Response, NextFunction } from 'express'
import { InvoiceStatus } from '../generated/prisma'
import * as invoicesService from '../services/invoices.service'

export async function listInvoicesController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await invoicesService.listInvoices(req.user!.id)
    res.json({ data: invoices })
  } catch (err) { next(err) }
}

export async function getInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.getInvoice(req.params.id as string, req.user!.id)
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function createInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.createInvoice(req.body, req.user!.id)
    res.status(201).json({ data: invoice })
  } catch (err) { next(err) }
}

export async function updateInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.updateInvoice(req.params.id as string, req.user!.id, req.body)
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function patchInvoiceStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoicesService.patchInvoiceStatus(
      req.params.id as string,
      req.user!.id,
      req.body.status as InvoiceStatus,
    )
    res.json({ data: invoice })
  } catch (err) { next(err) }
}

export async function deleteInvoiceController(req: Request, res: Response, next: NextFunction) {
  try {
    await invoicesService.deleteInvoice(req.params.id as string, req.user!.id)
    res.status(204).send()
  } catch (err) { next(err) }
}
