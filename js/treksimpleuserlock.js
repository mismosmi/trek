class TrekSimpleUserLock {

  constructor(user, api) {
    this.setUsername = (value) => user.name = value;
    this.api = api;
    this.contentSection = document.getElementById('trek-content-section');
    this.model = new TrekTableModel('trek_user', {trek_user: {columns: [
      {
        name: 'username',
        title: 'Username',
        class: 1,
        type: 'string'
      }
    ]}}, this.api);
    this.model.resetBuffer();
    //this.lock();
    this.lockButton = document.getElementById('trek-switch-user');
    this.lockButton.addEventListener('click', () => this.lock() );

    const resetTimer = () => {
      clearTimeout(this.lockTimer);
      this.lockTimer = setTimeout( () => this.lock() , 900000);
    } 

    document.addEventListener('keyup', (event) => {
      if (this.locked) {
        if (this.activeSuggestion !== undefined) {
          const s = this.activeSuggestion;
          switch (event.key) {
            case 'Enter':
              s.accept(s.current);
              return;
            case 'ArrowDown':
              s.select(s.current.nextSibling);
              return;
            case 'ArrowUp':
              s.select(s.current.previousSibling);
              return;
          }
        } else {
          switch (event.key) {
            case 'Enter':
              this.unlock();
              return;
          }
        }
      } else {
        resetTimer();
      }
    });

    document.addEventListener('mousemove', () => {
      if (!this.locked) resetTimer() 
    });


  }

  // callbacks
  onLock() {}
  onUnlock() {}


  lock() {
    this.model.sync();
    clearTimeout(this.lockTimer);
    this.lockSection = document.createElement('section');
    this.lockSection.id = 'trek-user-lock';
    this.lockSection.classList.add('section', 'container');
    const level = document.createElement('nav');
    level.classList.add('level');
    const levelItem = document.createElement('div');
    levelItem.classList.add('level-item', 'has-text-centered');
    const lockForm = document.createElement('article');
    lockForm.classList.add('media');
    const mediaContent = document.createElement('div');
    mediaContent.classList.add('media-content');
    const content = document.createElement('div');
    content.classList.add('content');
    const field = document.createElement('div');
    field.classList.add('field');
    const fieldLabel = document.createElement('div');
    fieldLabel.classList.add('field-label', 'is-pulled-left');
    const label = document.createElement('label');
    label.classList.add('label');
    label.textContent = 'User';
    fieldLabel.appendChild(label);
    field.appendChild(fieldLabel);
    const fieldBody = document.createElement('div');
    fieldBody.classList.add('field-body');
    const controlField = document.createElement('div');
    controlField.classList.add('field');

    this.input = new TrekSmartInput(
      this.model.columns[0], // column
      '', // value
      controlField, // target
      this.model // suggestionModel
    );
    this.input.onUpdate = (value) => {
      this.model.data['username'] = value;
    };
    this.input.onShowSuggestion = (suggestion) => this.activeSuggestion = suggestion;
    this.input.onHideSuggestion = () => this.activeSuggestion = undefined;
    this.input.setAttribute('tabindex', 1);

    fieldBody.appendChild(controlField);
    const button = document.createElement('span');
    button.classList.add('button', 'is-primary', 'is-pulled-right');
    button.textContent = 'Accept';
    button.addEventListener('click', () => this.unlock() );
    fieldBody.appendChild(button);
    field.appendChild(fieldBody);
    levelItem.appendChild(field);
    level.appendChild(levelItem);
    content.appendChild(level);
    mediaContent.appendChild(content);
    lockForm.appendChild(mediaContent);
    this.lockSection.appendChild(lockForm);
    this.input.focus();

    this.contentSection.parentNode.insertBefore(this.lockSection, this.contentSection);
    this.contentSection.style.display = 'none';

    this.locked = true;
    this.onLock();
  }

  unlock() {
    if (this.model.data['username']) {
      const name = this.model.data.username;
      if (this.model.find( row => row.username === name ) === undefined) {
        this.model.insert();
      }
      this.setUsername(name);
      this.lockSection.parentNode.removeChild(this.lockSection);
      this.contentSection.style.display = '';
      document.getElementById('username').textContent = name;
      this.locked = false;
      this.onUnlock();
      this.lockTimer = setTimeout( () => this.lock() , 900000);
    }
  }

}
