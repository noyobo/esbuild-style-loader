import styles from './index.scss?modules';

import React from 'react';
import { createRoot } from 'react-dom/client';

class App extends React.Component {
  render() {
    return (
      <div className={styles.app}>
        <h1 className={styles.title}>Hello World</h1>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);
