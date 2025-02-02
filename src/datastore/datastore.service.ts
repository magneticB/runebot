import { Injectable, Logger } from '@nestjs/common';
import { RarityConfig, Wizard, WizardBackground, rarityRegistry } from '../types';
import { AppConfigService } from '../config';
import { EmbedFieldData } from 'discord.js';
import data from '../wizard-summary.json';

@Injectable()
export class DataStoreService {
  private readonly _logger = new Logger(DataStoreService.name);

  get name(): string {
    return 'DataStoreService';
  }

  constructor(protected readonly configService: AppConfigService) {}

  /*
   * Get Wizard by ID
   */
  public async getWizard(id: string): Promise<Wizard> {
    try {
      const wizardJson = data.wizards[id], traits = [];
      let color: string;
      for (const trait in wizardJson.traits) {
        const [ name, value ] = wizardJson.traits[trait].split(': ', 2);
        if (name === 'background') {
          color = WizardBackground[value]
        }
        traits.push({
          name: name.charAt(0).toUpperCase() + name.substring(1),
          value: value,
          rarity: data.traitOccurences[wizardJson.traits[trait]],
        })
      }
      return {
        name: wizardJson.name,
        serial: id,
        nameLength: wizardJson.nameLength,
        traits: traits,
        traitCount: wizardJson.traitCount,
        backgroundColor: color,
        maxAffinity: wizardJson.maxAffinity,
        affinities: wizardJson.affinities,
      }
    }  
    catch (error) {
      this._logger.error(error);
    }
  }

  /*
   * Get wizard fields for discord embed message
   */
  public getWizardFields(wizard: Wizard): EmbedFieldData[] {
    const fields = [];

    // this is ugly
    let rarity = data.traitCounts[wizard.traitCount];
    let rarityName = this.getRarityDescriptor(rarity);
    fields.push({
      name: `${rarityName} Traits`,
      value: `${wizard.traitCount} (${(rarity / 100)}%)`,
      inline: true,
    });

    rarity = data.nameLengths[wizard.nameLength];
    rarityName = this.getRarityDescriptor(rarity);
    fields.push({
      name: `${rarityName} Name Length`,
      value: `${wizard.nameLength} (${(rarity / 100)}%)`,
      inline: true,
    });


    let affinitiesOutput = '';

    //Get all 100% affinties
    Object.entries(wizard.affinities)
      .filter((e) => e[1] >= 3)
      .filter((e) => e[1] === wizard.traitCount - 1)
      .sort((a, b) => {
          //reverse sort by rarity when affinity is the same
          return data.affinityOccurences[a[0]] - data.affinityOccurences[b[0]];
      })
      .forEach((a) => {
        affinitiesOutput += a[0] + ' (' + a[1] + '/' + (wizard.traitCount - 1) + ') traits\n';
      })

    //Display max affinitiy if not 100% attained
     if (affinitiesOutput == '') {
       affinitiesOutput = wizard.maxAffinity + ' (' + wizard.affinities[wizard.maxAffinity] + '/' + (wizard.traitCount - 1) + ') traits';
     }

    rarity = data.affinityOccurences[wizard.maxAffinity];
    rarityName = this.getAffinityRarityDescriptor(rarity);

    fields.push({
      name: `${rarityName} Affinity`,
      value: affinitiesOutput,
      inline: true,
    });

    for (const trait of wizard.traits) {
      fields.push({
        name: `${this.getRarityDescriptor(trait.rarity)} ${trait.name}`,
        value: `${trait.value} (${trait.rarity / 100}%)`,
        inline: true,
      })
    }
    return fields
  }

  /*
    * Get rarity config for specific trait
    */
  getRarityConfig(rarity: number, getCutoff: (config: RarityConfig) => number): RarityConfig {
    const rarityConfigs: RarityConfig[] = Object.values(rarityRegistry);
    for (const config of rarityConfigs) {
      if (getCutoff(config) >= rarity) {
        return config;
      }
    }
    return rarityRegistry.common;
  }

  getRarityDescriptor(rarity: number): string {
    return this.getRarityConfig(rarity, (config) => config.cutoff).name;
  }

  getAffinityRarityDescriptor(rarity: number): string {
    return this.getRarityConfig(rarity, (config) => config.affinityCutoff).name;
  }
}