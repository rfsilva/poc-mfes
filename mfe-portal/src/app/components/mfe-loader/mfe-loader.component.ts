import { Component, Input, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MfeCommunicationService } from '../../services/mfe-communication.service';
import { MfeInputData } from '../../models/auth.model';
import { ConfigService } from '../../services/config.service';
import { DynamicMfeLoaderService } from '../../services/dynamic-mfe-loader.service';
import { MfeConfig } from '../../models/config.model';

@Component({
  selector: 'app-mfe-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mfe-loader.component.html',
  styleUrls: ['./mfe-loader.component.scss']
})
export class MfeLoaderComponent implements OnInit, OnDestroy {
  @Input() mfeName!: string;
  @Input() inputData: MfeInputData = {};
  @ViewChild('mfeContainer', { read: ViewContainerRef }) container!: ViewContainerRef;

  isLoading = false;
  hasError = false;
  errorMessage = '';
  mfeConfig: MfeConfig | null = null;
  private componentRef: ComponentRef<any> | null = null;

  constructor(
    private configService: ConfigService,
    private dynamicLoader: DynamicMfeLoaderService,
    private mfeCommunication: MfeCommunicationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadMfe();
  }

  ngOnDestroy(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
  }

  private async loadMfe(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;

    try {
      // Carregar configuração do MFE
      const config = await this.configService.getMfeByName(this.mfeName);
      if (!config) {
        throw new Error(`MFE ${this.mfeName} não encontrado na configuração`);
      }
      this.mfeConfig = config;

      // Verificar saúde do MFE (opcional)
      const isHealthy = await this.configService.checkMfeHealth(this.mfeName);
      if (!isHealthy) {
        console.warn(`MFE ${this.mfeName} pode estar indisponível, tentando carregar mesmo assim`);
      }

      // Carregar componente dinamicamente
      const component = await this.dynamicLoader.loadMfeComponent(this.mfeName);
      
      // Criar instância do componente
      this.componentRef = this.container.createComponent(component);
      
      // Passar dados de entrada
      this.passInputData();

      this.isLoading = false;
      console.log(`MFE ${this.mfeName} carregado com sucesso`);

    } catch (error) {
      this.hasError = true;
      this.errorMessage = `Erro ao carregar MFE: ${this.mfeName}`;
      this.isLoading = false;
      console.error('Erro ao carregar MFE:', error);
    }
  }

  private passInputData(): void {
    if (!this.componentRef || !this.inputData || Object.keys(this.inputData).length === 0) {
      return;
    }

    // Passar dados via @Input properties
    Object.keys(this.inputData).forEach(key => {
      if (this.componentRef?.instance[key] !== undefined) {
        this.componentRef.instance[key] = this.inputData[key];
      }
    });

    // Enviar dados via comunicação entre MFEs
    setTimeout(() => {
      this.mfeCommunication.sendDataToMfe(this.mfeName, this.inputData);
    }, 100);
  }

  async retry(): Promise<void> {
    // Limpar cache e tentar novamente
    this.dynamicLoader.clearCache(this.mfeName);
    await this.loadMfe();
  }

  async reloadConfig(): Promise<void> {
    await this.configService.reloadConfig();
    await this.retry();
  }
}