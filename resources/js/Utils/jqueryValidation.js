/**
 * jQuery & Pure DOM Form Field Validation Helper
 * Highlight invalid form inputs, attach jQuery .is-invalid classes, and smoothly scroll to the first error element.
 */
export function runJQueryValidation(formSelector, errors = {}) {
  if (typeof window !== 'undefined' && window.$) {
    const $ = window.$;
    const $form = $(formSelector);
    if ($form.length) {
      $form.find('.is-invalid, .is-error').removeClass('is-invalid is-error');

      Object.keys(errors).forEach(key => {
        const cleanKey = key.replace(/\./g, '\\.');
        const $el = $form.find(`[name="${key}"], [name="${cleanKey}"], #${key}, [data-field="${key}"]`);
        if ($el.length) {
          $el.addClass('is-invalid is-error');
        }
      });

      const $firstErr = $form.find('.is-invalid, .is-error, .field-msg.error.show, input:invalid, select:invalid, textarea:invalid').first();
      if ($firstErr.length) {
        $firstErr.focus();
        $('html, body').animate({
          scrollTop: Math.max(0, $firstErr.offset().top - 140)
        }, 300);
      }
      return;
    }
  }

  // Pure DOM Fallback
  Object.keys(errors).forEach(key => {
    const el = document.querySelector(`[name="${key}"], #${key}, [data-field="${key}"]`);
    if (el) {
      el.classList.add('is-invalid', 'is-error');
    }
  });

  const firstErr = document.querySelector('.is-invalid, .is-error, .field-msg.error.show, input:invalid, select:invalid, textarea:invalid');
  if (firstErr) {
    firstErr.focus();
    firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
