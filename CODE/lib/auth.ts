import { VaultCrypto } from './crypto';
import { vaultDB } from './database';

/**
 * Auth service voor master wachtwoord beheer en sessie management
 */
export class AuthService {
  private static readonly MASTER_PASSWORD_KEY = 'vault_master_password_hash';
  private static readonly SESSION_KEY = 'vault_session';
  private static readonly VALIDATION_DATA_KEY = 'vault_validation_data';
  private static readonly SESSION_PASSWORD_KEY = 'vault_session_password';
  
  /**
   * Controleert of er al een master wachtwoord is ingesteld
   */
  static hasMasterPassword(): boolean {
    return localStorage.getItem(this.MASTER_PASSWORD_KEY) !== null;
  }
  
  /**
   * Stelt een nieuw master wachtwoord in (eerste keer setup)
   */
  static setMasterPassword(password: string): boolean {
    try {
      if (this.hasMasterPassword()) {
        throw new Error('Master wachtwoord is al ingesteld');
      }
      
      // Hash het wachtwoord voor opslag
      const hashedPassword = VaultCrypto.hashMasterPassword(password);
      localStorage.setItem(this.MASTER_PASSWORD_KEY, hashedPassword);
      
      // Maak validatie data aan voor toekomstige verificatie
      const validationData = VaultCrypto.encrypt('validation_test', password);
      localStorage.setItem(this.VALIDATION_DATA_KEY, validationData);
      
      return true;
    } catch (error) {
      console.error('Fout bij instellen master wachtwoord:', error);
      return false;
    }
  }
  
  /**
   * Verifieert het master wachtwoord
   */
  static verifyMasterPassword(password: string): boolean {
    try {
      const storedHash = localStorage.getItem(this.MASTER_PASSWORD_KEY);
      const validationData = localStorage.getItem(this.VALIDATION_DATA_KEY);
      
      if (!storedHash) {
        return false;
      }
      
      // Controleer hash
      const inputHash = VaultCrypto.hashMasterPassword(password);
      if (inputHash !== storedHash) {
        return false;
      }
      
      // Extra validatie met encrypted data als beschikbaar
      if (validationData) {
        return VaultCrypto.validateMasterPassword(password, validationData);
      }
      
      return true;
    } catch (error) {
      console.error('Fout bij verificatie master wachtwoord:', error);
      return false;
    }
  }
  
  /**
   * Wijzigt het master wachtwoord (vereist huidig wachtwoord)
   */
  static changeMasterPassword(currentPassword: string, newPassword: string): boolean {
    try {
      // Verifieer huidig wachtwoord
      if (!this.verifyMasterPassword(currentPassword)) {
        throw new Error('Huidig wachtwoord is onjuist');
      }
      
      // Stel nieuw wachtwoord in
      const newHashedPassword = VaultCrypto.hashMasterPassword(newPassword);
      localStorage.setItem(this.MASTER_PASSWORD_KEY, newHashedPassword);
      
      // Update validatie data
      const newValidationData = VaultCrypto.encrypt('validation_test', newPassword);
      localStorage.setItem(this.VALIDATION_DATA_KEY, newValidationData);
      
      // Invalideer huidige sessie
      this.logout();
      
      return true;
    } catch (error) {
      console.error('Fout bij wijzigen master wachtwoord:', error);
      return false;
    }
  }
  
  /**
   * Logt in met master wachtwoord
   */
  static async login(password: string): Promise<boolean> {
    if (this.verifyMasterPassword(password)) {
      // Sla sessie op met geëncrypteerd wachtwoord voor persistentie
      const sessionData = {
        timestamp: Date.now(),
        isAuthenticated: true
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      
      // Sla master password veilig geëncrypteerd op in sessie
      const sessionKey = 'session_key_' + sessionData.timestamp;
      const encryptedPassword = VaultCrypto.encrypt(password, sessionKey);
      sessionStorage.setItem(this.SESSION_PASSWORD_KEY, encryptedPassword);
      
      // Initialize database with master password for file operations
      vaultDB.setMasterPassword(password);
      
      // Auto-sync vault items from server
      try {
        const syncResult = await vaultDB.autoSyncVaultItems();
        if (syncResult.success) {
          console.log(`Auto-sync completed: ${syncResult.action} ${syncResult.count || 0} items`);
        } else if (syncResult.error && !syncResult.error.includes('Server not available')) {
          console.warn('Auto-sync failed:', syncResult.error);
        }
      } catch (error) {
        console.warn('Auto-sync error:', error);
        // Don't fail login if sync fails
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Logt uit en wist sessie
   */
  static logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.SESSION_PASSWORD_KEY);
    
    // Clear master password from database and file server API
    vaultDB.clearMasterPassword();
    vaultDB.clearServerAPI();
  }
  
  /**
   * Controleert of gebruiker is ingelogd
   */
  static isAuthenticated(): boolean {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY);
      if (!sessionData) {
        return false;
      }
      
      const session = JSON.parse(sessionData);
      
      // Controleer of sessie niet te oud is (bijv. 8 uur)
      const maxAge = 8 * 60 * 60 * 1000; // 8 uur in milliseconden
      const isExpired = Date.now() - session.timestamp > maxAge;
      
      if (isExpired) {
        this.logout();
        return false;
      }
      
      return session.isAuthenticated === true;
    } catch {
      return false;
    }
  }
  
  /**
   * Herstelt master password uit sessie (na page reload)
   */
  static restoreMasterPasswordFromSession(): boolean {
    try {
      const encryptedPassword = sessionStorage.getItem(this.SESSION_PASSWORD_KEY);
      const sessionDataStr = sessionStorage.getItem(this.SESSION_KEY);
      
      if (!encryptedPassword || !sessionDataStr || !this.isAuthenticated()) {
        return false;
      }
      
      const sessionData = JSON.parse(sessionDataStr);
      const sessionKey = 'session_key_' + sessionData.timestamp;
      
      try {
        const decryptedPassword = VaultCrypto.decrypt(encryptedPassword, sessionKey);
        
        if (this.verifyMasterPassword(decryptedPassword)) {
          vaultDB.setMasterPassword(decryptedPassword);
          console.log('🔐 Master password successfully restored from session');
          return true;
        }
      } catch (decryptError) {
        console.error('Failed to decrypt session password:', decryptError);
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to restore master password from session:', error);
      return false;
    }
  }
  
  /**
   * Reset alle auth data (voor noodgevallen)
   */
  static resetAuth(): void {
    localStorage.removeItem(this.MASTER_PASSWORD_KEY);
    localStorage.removeItem(this.VALIDATION_DATA_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.SESSION_PASSWORD_KEY);
    
    // Clear database and file server API
    vaultDB.clearMasterPassword();
    vaultDB.clearServerAPI();
  }
  
  /**
   * Verlengt de huidige sessie
   */
  static extendSession(): void {
    if (this.isAuthenticated()) {
      const sessionData = {
        timestamp: Date.now(),
        isAuthenticated: true
      };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    }
  }
}