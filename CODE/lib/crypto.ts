import CryptoJS from 'crypto-js';

/**
 * Crypto utility class voor encryptie en decryptie van vault gegevens
 */
export class VaultCrypto {
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  
  /**
   * Genereert een hash van het master wachtwoord voor verificatie
   */
  static hashMasterPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }
  
  /**
   * Leidt een encryptie sleutel af van het master wachtwoord
   */
  private static deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    }).toString();
  }
  
  /**
   * Genereert een willekeurige salt
   */
  private static generateSalt(): string {
    return CryptoJS.lib.WordArray.random(this.SALT_LENGTH).toString();
  }
  
  /**
   * Genereert een willekeurige IV (Initialization Vector)
   */
  private static generateIV(): string {
    return CryptoJS.lib.WordArray.random(this.IV_LENGTH).toString();
  }
  
  /**
   * Encrypts data met het master wachtwoord
   */
  static encrypt(data: string, masterPassword: string): string {
    try {
      const salt = this.generateSalt();
      const iv = this.generateIV();
      const key = this.deriveKey(masterPassword, salt);
      
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Combineer salt, iv en encrypted data
      return salt + ':' + iv + ':' + encrypted.toString();
    } catch (error) {
      console.error('Encryptie fout:', error);
      throw new Error('Kon gegevens niet versleutelen');
    }
  }
  
  /**
   * Decrypts data met het master wachtwoord
   */
  static decrypt(encryptedData: string, masterPassword: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Ongeldig encrypted data formaat');
      }
      
      const [salt, iv, encrypted] = parts;
      const key = this.deriveKey(masterPassword, salt);
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) {
        throw new Error('Decryptie mislukt - mogelijk verkeerd wachtwoord');
      }
      
      return decryptedString;
    } catch (error) {
      console.error('Decryptie fout:', error);
      throw new Error('Kon gegevens niet ontsleutelen - controleer je master wachtwoord');
    }
  }
  
  /**
   * Encrypts een VaultItem object
   */
  static encryptVaultItem(item: any, masterPassword: string): any {
    const sensitiveFields = ['password', 'username', 'description', 'url', 'linkUrl'];
    const encryptedItem = { ...item };
    
    sensitiveFields.forEach(field => {
      if (encryptedItem[field]) {
        encryptedItem[field] = this.encrypt(encryptedItem[field], masterPassword);
      }
    });
    
    return encryptedItem;
  }
  
  /**
   * Decrypts een VaultItem object
   */
  static decryptVaultItem(encryptedItem: any, masterPassword: string): any {
    const sensitiveFields = ['password', 'username', 'description', 'url', 'linkUrl'];
    const decryptedItem = { ...encryptedItem };
    
    sensitiveFields.forEach(field => {
      if (decryptedItem[field] && typeof decryptedItem[field] === 'string' && decryptedItem[field].includes(':')) {
        try {
          decryptedItem[field] = this.decrypt(decryptedItem[field], masterPassword);
        } catch (error) {
          console.warn(`Kon veld ${field} niet decrypten:`, error);
          // Behoud originele waarde als decryptie mislukt
        }
      }
    });
    
    return decryptedItem;
  }
  
  /**
   * Valideert of een master wachtwoord correct is door een test decryptie uit te voeren
   */
  static validateMasterPassword(password: string, testData?: string): boolean {
    try {
      if (!testData) {
        // Als er geen test data is, maak een test encryptie/decryptie
        const testString = 'test_validation_string';
        const encrypted = this.encrypt(testString, password);
        const decrypted = this.decrypt(encrypted, password);
        return decrypted === testString;
      } else {
        // Probeer bestaande test data te decrypten
        this.decrypt(testData, password);
        return true;
      }
    } catch {
      return false;
    }
  }
}