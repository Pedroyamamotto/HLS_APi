import {
  createImportJob,
  getImportJob,
  processStklockImport,
} from '../../services/stklockImportService.js';

export async function startStklockImport(req, res) {
  try {
    const { hotelId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Envie o arquivo .mdb no campo database',
      });
    }

    const originalName = req.file.originalname || '';
    if (!originalName.toLowerCase().endsWith('.mdb')) {
      return res.status(400).json({
        success: false,
        message: 'Apenas arquivos .mdb sao aceitos',
      });
    }

    const job = await createImportJob({
      hotelId,
      filePath: req.file.path,
      originalName,
    });

    processStklockImport(job.id).catch((error) => {
      console.error('[stklockImport] falha em background:', error?.message || error);
    });

    return res.status(202).json({
      success: true,
      message: 'Importacao iniciada',
      jobId: job.id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao iniciar importacao',
      error: error.message,
    });
  }
}

export async function getStklockImportStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = await getImportJob(jobId);

    return res.json({
      success: true,
      job,
    });
  } catch (error) {
    if (String(error?.message || '').includes('nao encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar status',
      error: error.message,
    });
  }
}
