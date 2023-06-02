import styles from './index.modules.less';

import React from 'react';
import { createRoot } from 'react-dom/client';
const App = () => (
  <div className={'app'}>
    <h1 className={'title'}>Hello World</h1>
  </div>
);

createRoot(document.getElementById('root')).render(<App />);
